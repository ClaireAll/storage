/** 请求地址类型，支持字符串和 URL 对象。 */
export type Url = string | URL;

/** 请求响应解析类型，用于控制公共请求方法返回的数据格式。 */
export type ResponseType = "json" | "text" | "blob" | "arrayBuffer" | "response";

/** 请求方法枚举，用于统一描述 HTTP 请求类型。 */
export enum RequestType {
  /** GET 请求。 */
  GET = "GET",
  /** POST 请求。 */
  POST = "POST",
  /** PUT 请求。 */
  PUT = "PUT",
}

/** 公共请求方法的基础参数。 */
type RequestOpts = {
  /** 请求地址。 */
  url: string;
  /** 请求方法。 */
  type: RequestType;
  /** 请求体数据。 */
  data?: unknown;
  /** URL 查询参数。 */
  params?: Record<string, string | number | boolean | null | undefined>;
  /** 请求头。 */
  headers?: HeadersInit;
  /** 响应解析类型。 */
  responseType?: ResponseType;
};

/** 增删改查请求的外部入参。 */
export type CrudReqOpts = {
  /** 请求体数据。 */
  data?: unknown;
  /** URL 查询参数。 */
  params?: Record<string, string | number | boolean | null | undefined>;
  /** 请求头。 */
  headers?: HeadersInit;
  /** 响应解析类型。 */
  responseType?: ResponseType;
};

/** 将传入地址统一格式化为字符串，参数 url 为字符串或 URL 对象。 */
function formatUrl(url: Url) {
  return url instanceof URL ? url.toString() : url;
}

/** 拼接 URL 查询参数，参数 url 为原始地址，params 为查询参数对象。 */
function appendParams(
  url: string,
  params: Record<string, string | number | boolean | null | undefined>,
) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  if (!query) {
    return url;
  }

  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
}

/** 根据 responseType 解析响应内容，参数 response 为 fetch 返回的响应对象。 */
async function parseResponse(response: Response, responseType: ResponseType) {
  if (responseType === "response") {
    return response;
  }

  if (responseType === "text") {
    return response.text();
  }

  if (responseType === "blob") {
    return response.blob();
  }

  if (responseType === "arrayBuffer") {
    return response.arrayBuffer();
  }

  return response.json();
}

/** 执行公共请求，参数 opts 包含地址、方法、数据、查询参数和响应解析方式。 */
async function request<T = unknown>(opts: RequestOpts) {
  const {
    data,
    headers = {},
    params = {},
    responseType = "json",
    type,
    url,
  } = opts;
  const hasBody = data !== undefined;
  const response = await fetch(appendParams(url, params), {
    body: hasBody ? JSON.stringify(data) : undefined,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    method: type,
  });

  if (!response.ok) {
    const errorResult = await parseResponse(response, "json").catch(() => null);
    const message =
      errorResult &&
      typeof errorResult === "object" &&
      "message" in errorResult &&
      typeof errorResult.message === "string"
        ? errorResult.message
        : "请求失败";

    throw new Error(message);
  }

  return parseResponse(response, responseType) as Promise<T>;
}

/** 发送 GET 请求，参数 url 为请求地址，opts 为查询参数、请求头和响应类型配置。 */
export function reqGet<T = unknown>(
  url: Url,
  opts: Omit<CrudReqOpts, "data"> = {},
) {
  const { headers = {}, params = {}, responseType } = opts;

  return request<T>({
    headers,
    params,
    responseType,
    type: RequestType.GET,
    url: formatUrl(url),
  });
}

/** 发送 POST 请求，参数 url 为请求地址，opts 为请求体、查询参数、请求头和响应类型配置。 */
export function reqPost<T = unknown>(url: Url, opts: CrudReqOpts = {}) {
  const { data, headers = {}, params = {}, responseType } = opts;

  return request<T>({
    data,
    headers,
    params,
    responseType,
    type: RequestType.POST,
    url: formatUrl(url),
  });
}

/** 发送 PUT 请求，参数 url 为请求地址，opts 为请求体、查询参数、请求头和响应类型配置。 */
export function reqPut<T = unknown>(url: Url, opts: CrudReqOpts = {}) {
  const { data, headers = {}, params = {}, responseType } = opts;

  return request<T>({
    data,
    headers,
    params,
    responseType,
    type: RequestType.PUT,
    url: formatUrl(url),
  });
}
