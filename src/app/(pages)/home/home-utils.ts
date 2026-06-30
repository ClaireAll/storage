import { getCascaderData } from "cn-division/cascader-pca";

export type TodayWeather = {
  description: string;
  max: number;
  min: number;
  temp: number;
};

export type WeatherLocation = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  name: string;
};

type OpenMeteoForecast = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

type OpenMeteoLocationResult = {
  admin1?: string;
  country?: string;
  id?: number;
  latitude: number;
  longitude: number;
  name: string;
};

type OpenMeteoGeocoding = {
  results?: OpenMeteoLocationResult[];
};

type ReverseGeocodeResult = {
  city?: string;
  countryName?: string;
  locality?: string;
  localityInfo?: {
    administrative?: Array<{
      description?: string;
      isoName?: string;
      name?: string;
    }>;
  };
  principalSubdivision?: string;
};

export const weatherAreaOptions = getCascaderData();

const chinaCountryNames = new Set(["中国", "中华人民共和国"]);

const weatherCodeLabels = new Map<number, string>([
  [0, "晴"],
  [1, "多云"],
  [2, "多云"],
  [3, "阴"],
  [45, "雾"],
  [48, "雾"],
  [51, "小雨"],
  [53, "小雨"],
  [55, "小雨"],
  [61, "雨"],
  [63, "雨"],
  [65, "大雨"],
  [71, "雪"],
  [73, "雪"],
  [75, "大雪"],
  [80, "阵雨"],
  [81, "阵雨"],
  [82, "强阵雨"],
  [95, "雷雨"],
]);

function getWeatherDescription(code?: number) {
  return typeof code === "number"
    ? (weatherCodeLabels.get(code) ?? "天气")
    : "天气";
}

function formatTemperature(value?: number) {
  return typeof value === "number" ? Math.round(value) : 0;
}

function formatCurrentWeatherLocationLabel({
  latitude,
  longitude,
}: Pick<GeolocationCoordinates, "latitude" | "longitude">) {
  return `纬度 ${latitude.toFixed(4)}，经度 ${longitude.toFixed(4)}`;
}

function normalizeDivisionName(value?: string) {
  return (value ?? "")
    .replace(
      /(特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|自治州|自治县|地区|盟|市|区|县|省)$/u,
      "",
    )
    .trim();
}

function isChinaLocation(location: OpenMeteoLocationResult) {
  return location.country ? chinaCountryNames.has(location.country) : false;
}

function scoreLocation(
  location: OpenMeteoLocationResult,
  areaPath: string[],
  query: string,
) {
  const province = normalizeDivisionName(areaPath[0]);
  const city = normalizeDivisionName(areaPath[1]);
  const county = normalizeDivisionName(areaPath[2]);
  const locationName = normalizeDivisionName(location.name);
  const adminName = normalizeDivisionName(location.admin1);
  const queryName = normalizeDivisionName(query);
  let score = isChinaLocation(location) ? 100 : -100;

  if (province && adminName && (adminName === province || adminName.includes(province))) {
    score += 80;
  }

  if (locationName === county) {
    score += 50;
  }

  if (locationName === city) {
    score += 40;
  }

  if (locationName === queryName) {
    score += 20;
  }

  return score;
}

async function fetchWithRetry(input: string, init?: RequestInit) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(input, init);

      if (response.ok) {
        return response;
      }

      lastError = new Error(`request failed: ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("request failed");
}

function getLocationSearchCandidates(areaPath: string[]) {
  const province = areaPath[0];
  const city = areaPath[1];
  const county = areaPath[2];
  const candidates = [
    city,
    normalizeDivisionName(city),
    county,
    normalizeDivisionName(county),
    province,
    normalizeDivisionName(province),
    areaPath.filter(Boolean).join(""),
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set(candidates));
}

async function searchWeatherLocation(query: string, areaPath: string[]) {
  const keyword = query.trim();

  if (!keyword) {
    return null;
  }

  const params = new URLSearchParams({
    count: "20",
    format: "json",
    language: "zh",
    name: keyword,
  });
  const response = await fetchWithRetry(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
    { cache: "no-store" },
  );

  const data = (await response.json()) as OpenMeteoGeocoding;
  const province = normalizeDivisionName(areaPath[0]);
  const chinaResults = (data.results ?? []).filter(isChinaLocation);
  const provinceResults = province
    ? chinaResults.filter((location) => {
        const adminName = normalizeDivisionName(location.admin1);

        return adminName === province || adminName.includes(province);
      })
    : chinaResults;
  const location = provinceResults.sort(
    (prev, next) =>
      scoreLocation(next, areaPath, keyword) -
      scoreLocation(prev, areaPath, keyword),
  )[0];

  return location
    ? ({
        id: String(
          location.id ??
            `${location.latitude},${location.longitude},${location.name}`,
        ),
        label: keyword,
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name,
      } satisfies WeatherLocation)
    : null;
}

export async function resolveWeatherLocationByAreaPath(areaPath: string[]) {
  const label = areaPath.filter(Boolean).join(" · ");
  const candidates = getLocationSearchCandidates(areaPath);

  for (const candidate of candidates) {
    const location = await searchWeatherLocation(candidate, areaPath);

    if (location) {
      return {
        ...location,
        label,
        name: areaPath.at(-1) ?? location.name,
      } satisfies WeatherLocation;
    }
  }

  throw new Error("location resolve failed");
}

export async function resolveCurrentWeatherLocation(
  coords: Pick<GeolocationCoordinates, "latitude" | "longitude">,
) {
  const fallbackLabel = formatCurrentWeatherLocationLabel(coords);
  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    localityLanguage: "zh",
    longitude: String(coords.longitude),
  });

  try {
    const response = await fetchWithRetry(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`,
      { cache: "no-store" },
    );
    const data = (await response.json()) as ReverseGeocodeResult;
    const administrativeNames =
      data.localityInfo?.administrative
        ?.map((item) => item.name ?? item.description ?? item.isoName)
        .filter((item): item is string => Boolean(item?.trim())) ?? [];
    const labelParts = [
      data.locality,
      data.city,
      ...administrativeNames.slice(-2),
      data.principalSubdivision,
      data.countryName,
    ].filter((item): item is string => Boolean(item?.trim()));
    const label = Array.from(new Set(labelParts)).slice(0, 3).join(" · ");

    return {
      id: "current-location",
      label: label || fallbackLabel,
      latitude: coords.latitude,
      longitude: coords.longitude,
      name: label || fallbackLabel,
    } satisfies WeatherLocation;
  } catch {
    return {
      id: "current-location",
      label: fallbackLabel,
      latitude: coords.latitude,
      longitude: coords.longitude,
      name: fallbackLabel,
    } satisfies WeatherLocation;
  }
}

export async function fetchTodayWeather(
  coords: Pick<GeolocationCoordinates, "latitude" | "longitude">,
) {
  const params = new URLSearchParams({
    current: "temperature_2m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min",
    forecast_days: "1",
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    timezone: "auto",
  });
  const response = await fetchWithRetry(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    { cache: "no-store" },
  );

  const forecast = (await response.json()) as OpenMeteoForecast;

  return {
    description: getWeatherDescription(forecast.current?.weather_code),
    max: formatTemperature(forecast.daily?.temperature_2m_max?.[0]),
    min: formatTemperature(forecast.daily?.temperature_2m_min?.[0]),
    temp: formatTemperature(forecast.current?.temperature_2m),
  } satisfies TodayWeather;
}
