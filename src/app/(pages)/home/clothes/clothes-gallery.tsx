"use client";

import { useHomeContentActions } from "@/app/(pages)/home/home-view";
import { cn } from "@/lib/utils";
import {
  AppstoreOutlined,
  BarsOutlined,
  DownloadOutlined,
  EditOutlined,
  FilterOutlined,
  LinkOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Image,
  Input,
  InputNumber,
  Pagination,
  Segmented,
  Select,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useRef, useState, type ReactNode } from "react";
import type { ClothesItem } from "./clothes-type";
import { matchClothesNameSearch, parseClothesSeasons } from "./clothes-utils";

type ClothesViewMode = "card" | "detail";
type ClothesSortRule =
  | "purchase-desc"
  | "purchase-asc"
  | "price-desc"
  | "price-asc"
  | "season-asc"
  | "season-desc";

/** 衣服陈列组件接收的属性。 */
type ClothesGalleryProps = {
  /** 衣服文章推荐列表。 */
  clothes: ClothesItem[];
  hasBookCategory?: boolean;
  /** 是否展示颜色标记。 */
  hasColor?: boolean;
  hasDate?: boolean;
  hasPrice?: boolean;
  /** 是否展示季节筛选和季节信息。 */
  hasSeason?: boolean;
  itemCategoryLabels?: Record<number, string>;
  /** 当前文章推荐名称，用于界面文案。 */
  itemLabel?: string;
  /** 是否展示数量。 */
  showCount?: boolean;
};

const { RangePicker } = DatePicker;
const defaultPageSize = 8;
const maxPageSize = 100;
const defaultSortRule: ClothesSortRule = "purchase-desc";
const defaultNoDateSortRule: ClothesSortRule = "price-desc";
const seasons = ["春", "夏", "秋", "冬"];
const seasonOptions = seasons.map((season) => ({
  label: season,
  value: season,
}));
const sortOptions: Array<{
  label: string;
  value: ClothesSortRule;
}> = [
  { label: "购买时间 新-旧", value: "purchase-desc" },
  { label: "购买时间 旧-新", value: "purchase-asc" },
  { label: "价格 高-低", value: "price-desc" },
  { label: "价格 低-高", value: "price-asc" },
  { label: "季节 春-冬", value: "season-asc" },
  { label: "季节 冬-春", value: "season-desc" },
];

function getSeasonSortIndex(seasonValue: string) {
  const seasonIndexes = parseClothesSeasons(seasonValue).map((season) =>
    seasons.indexOf(season),
  );
  const validSeasonIndexes = seasonIndexes.filter((index) => index !== -1);

  return validSeasonIndexes.length
    ? Math.min(...validSeasonIndexes)
    : seasons.length;
}

function getItemCategoryLabel(
  categoryLabels: Record<number, string> | undefined,
  category?: number,
) {
  return category ? (categoryLabels?.[category] ?? `分类 ${category}`) : "";
}

function getItemImageUrls(item: ClothesItem) {
  if (item.pic_urls?.length) {
    return item.pic_urls;
  }

  return item.pic_url ? [item.pic_url] : [];
}

function isPurchaseSortRule(sortRule: ClothesSortRule) {
  return sortRule === "purchase-asc" || sortRule === "purchase-desc";
}

function isSeasonSortRule(sortRule: ClothesSortRule) {
  return sortRule === "season-asc" || sortRule === "season-desc";
}

function getEffectiveSortRule({
  hasDate,
  hasPrice,
  hasSeason,
  sortRule,
}: {
  hasDate: boolean;
  hasPrice: boolean;
  hasSeason: boolean;
  sortRule: ClothesSortRule;
}) {
  if (!hasDate && isPurchaseSortRule(sortRule)) {
    return hasPrice ? defaultNoDateSortRule : "season-asc";
  }

  if (!hasPrice && sortRule.startsWith("price-")) {
    return hasDate ? defaultSortRule : "season-asc";
  }

  if (!hasSeason && isSeasonSortRule(sortRule)) {
    return hasDate
      ? defaultSortRule
      : hasPrice
        ? defaultNoDateSortRule
        : sortRule;
  }

  return sortRule;
}

/** 渲染带搜索命中高亮的衣服名称。 */
function renderHighlightedClothesName(
  name: string,
  highlightIndexes: Set<number>,
) {
  return Array.from(name).map((char, index) =>
    highlightIndexes.has(index) ? (
      <span className="clothes-gallery-name-highlight" key={`${char}-${index}`}>
        {char}
      </span>
    ) : (
      <span key={`${char}-${index}`}>{char}</span>
    ),
  );
}

const viewModeOptions: Array<{
  icon: ReactNode;
  label: string;
  value: ClothesViewMode;
}> = [
  { icon: <AppstoreOutlined />, label: "卡片视图", value: "card" },
  { icon: <BarsOutlined />, label: "详细信息", value: "detail" },
];

/** 衣服页陈列面板，负责搜索、筛选、分页和视图切换。 */
export function ClothesGallery({
  clothes,
  hasBookCategory = false,
  hasColor = true,
  hasDate = true,
  hasPrice = true,
  hasSeason = true,
  itemCategoryLabels,
  itemLabel = "衣服",
  showCount = false,
}: ClothesGalleryProps) {
  const { openClothesCreateModal, openClothesEditModal } =
    useHomeContentActions();
  const [keyword, setKeyword] = useState("");
  const [keywordDraft, setKeywordDraft] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [pageSizeInput, setPageSizeInput] = useState<number | null>(
    defaultPageSize,
  );
  const [priceRange, setPriceRange] = useState<[number | null, number | null]>([
    null,
    null,
  ]);
  const [selectedSeason, setSelectedSeason] = useState<string[]>(seasons);
  const [sortRule, setSortRule] = useState<ClothesSortRule>(defaultSortRule);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [timeRange, setTimeRange] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);
  const [viewMode, setViewMode] = useState<ClothesViewMode>("card");
  const isKeywordComposingRef = useRef(false);
  const normalizedKeyword = keyword.trim().toLowerCase();
  const effectiveSortRule = getEffectiveSortRule({
    hasDate,
    hasPrice,
    hasSeason,
    sortRule,
  });
  const defaultEffectiveSortRule = hasDate
    ? defaultSortRule
    : hasPrice
      ? defaultNoDateSortRule
      : "purchase-desc";
  const availableSortOptions = sortOptions.filter((option) => {
    if (!hasDate && isPurchaseSortRule(option.value)) {
      return false;
    }

    if (!hasPrice && option.value.startsWith("price-")) {
      return false;
    }

    if (!hasSeason && isSeasonSortRule(option.value)) {
      return false;
    }

    return true;
  });
  const hasAdvancedControls =
    hasSeason || hasDate || hasPrice || availableSortOptions.length > 0;
  const filteredClothes = useMemo(
    () =>
      clothes.filter((item) => {
        const purchaseDate = hasDate ? dayjs(item.timeStamp) : null;
        const [startDate, endDate] = timeRange;
        const [minPrice, maxPrice] = priceRange;
        const nameSearchMatch = matchClothesNameSearch(
          item.name,
          normalizedKeyword,
        );
        const matchesKeyword =
          nameSearchMatch.matched ||
          [
            hasSeason ? item.season : "",
            hasDate ? item.timeStamp : "",
            hasBookCategory || itemCategoryLabels
              ? getItemCategoryLabel(itemCategoryLabels, item.category)
              : "",
            showCount && item.count !== undefined ? String(item.count) : "",
          ]
            .filter((field): field is string => Boolean(field))
            .some((field) => field.toLowerCase().includes(normalizedKeyword));
        const itemSeasons = hasSeason
          ? parseClothesSeasons(item.season ?? "")
          : [];
        const matchesSeason = hasSeason
          ? selectedSeason.length > 0 && selectedSeason.length < seasons.length
            ? itemSeasons.some((season) => selectedSeason.includes(season))
            : true
          : true;
        const matchesTime = hasDate
          ? (!startDate ||
              purchaseDate?.isSame(startDate, "day") ||
              purchaseDate?.isAfter(startDate, "day")) &&
            (!endDate ||
              purchaseDate?.isSame(endDate, "day") ||
              purchaseDate?.isBefore(endDate, "day"))
          : true;
        const itemPrice = item.price ?? 0;
        const matchesPrice =
          !hasPrice ||
          ((minPrice === null || itemPrice >= minPrice) &&
            (maxPrice === null || itemPrice <= maxPrice));

        return matchesKeyword && matchesSeason && matchesTime && matchesPrice;
      }),
    [
      clothes,
      hasBookCategory,
      hasDate,
      hasPrice,
      hasSeason,
      itemCategoryLabels,
      normalizedKeyword,
      priceRange,
      selectedSeason,
      showCount,
      timeRange,
    ],
  );
  const sortedClothes = useMemo(
    () =>
      [...filteredClothes].sort((firstItem, secondItem) => {
        switch (effectiveSortRule) {
          case "purchase-asc":
            return (
              dayjs(firstItem.timeStamp).valueOf() -
              dayjs(secondItem.timeStamp).valueOf()
            );
          case "price-desc":
            return (secondItem.price ?? 0) - (firstItem.price ?? 0);
          case "price-asc":
            return (firstItem.price ?? 0) - (secondItem.price ?? 0);
          case "season-asc":
            return (
              getSeasonSortIndex(firstItem.season ?? "") -
              getSeasonSortIndex(secondItem.season ?? "")
            );
          case "season-desc":
            return (
              getSeasonSortIndex(secondItem.season ?? "") -
              getSeasonSortIndex(firstItem.season ?? "")
            );
          case "purchase-desc":
          default:
            return (
              dayjs(secondItem.timeStamp).valueOf() -
              dayjs(firstItem.timeStamp).valueOf()
            );
        }
      }),
    [effectiveSortRule, filteredClothes],
  );
  const totalPages = Math.max(1, Math.ceil(sortedClothes.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedClothes = sortedClothes.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  const hasAdvancedFilter =
    hasAdvancedControls &&
    ((hasSeason &&
      selectedSeason.length > 0 &&
      selectedSeason.length < seasons.length) ||
      (hasPrice && priceRange.some((value) => value !== null)) ||
      (hasDate && timeRange.some(Boolean)) ||
      effectiveSortRule !== defaultEffectiveSortRule);
  const hasFilter = Boolean(normalizedKeyword) || hasAdvancedFilter;
  const canResetFilters = hasFilter;
  const isFilterButtonActive = filtersExpanded || hasFilter;
  const shouldShowFilterDetails = hasAdvancedControls && filtersExpanded;
  const emptyDescription = hasFilter
    ? `没有匹配的${itemLabel}`
    : `还没有${itemLabel}推荐`;

  /** 搜索衣服名称，参数 nextKeyword 为输入框最新值。 */
  function searchClothes(nextKeyword: string) {
    setKeywordDraft(nextKeyword);
    setKeyword(nextKeyword);
    setPage(1);
  }

  function changeKeyword(event: React.ChangeEvent<HTMLInputElement>) {
    const nextKeyword = event.target.value;

    setKeywordDraft(nextKeyword);

    if (!isKeywordComposingRef.current) {
      setKeyword(nextKeyword);
      setPage(1);
    }
  }

  function startKeywordComposition() {
    isKeywordComposingRef.current = true;
  }

  function finishKeywordComposition(
    event: React.CompositionEvent<HTMLInputElement>,
  ) {
    isKeywordComposingRef.current = false;
    searchClothes(event.currentTarget.value);
  }

  /** 筛选购买日期范围，参数 nextRange 为用户选择的起止日期。 */
  function filterTimeRange(nextRange: [Dayjs | null, Dayjs | null] | null) {
    setTimeRange(nextRange ?? [null, null]);
    setPage(1);
  }

  /** 筛选最低价格，参数 nextPrice 为最低价格。 */
  function filterMinPrice(nextPrice: number | null) {
    setPriceRange((currentRange) => [nextPrice, currentRange[1]]);
    setPage(1);
  }

  /** 筛选最高价格，参数 nextPrice 为最高价格。 */
  function filterMaxPrice(nextPrice: number | null) {
    setPriceRange((currentRange) => [currentRange[0], nextPrice]);
    setPage(1);
  }

  /** 筛选季节，参数 nextSeason 为用户选择的季节。 */
  function filterSeason(nextSeason: string[]) {
    setSelectedSeason(nextSeason);
    setPage(1);
  }

  /** 重置所有筛选条件，并回到第一页。 */
  function resetFilters() {
    setKeyword("");
    setKeywordDraft("");
    setFiltersExpanded(false);
    setPage(1);
    setPriceRange([null, null]);
    setSelectedSeason(seasons);
    setSortRule(defaultSortRule);
    setTimeRange([null, null]);
  }

  /** 切换筛选详情区的显示状态。 */
  function toggleAdvancedFilters() {
    setFiltersExpanded((visible) => !visible);
  }

  /** 切换排序规则，参数 nextSortRule 为用户选择的排序方式。 */
  function changeSortRule(nextSortRule: ClothesSortRule) {
    setSortRule(nextSortRule);
    setPage(1);
  }

  /** 切换衣服陈列视图，参数 nextMode 为卡片或详细信息视图。 */
  function changeViewMode(nextMode: ClothesViewMode) {
    setViewMode(nextMode);
    setPage(1);
  }

  function changePageSize(nextPageSize: number | null) {
    setPageSizeInput(nextPageSize);

    if (!nextPageSize || !Number.isFinite(nextPageSize)) {
      return;
    }

    const normalizedPageSize = Math.min(
      maxPageSize,
      Math.max(1, Math.floor(nextPageSize)),
    );

    setPageSize(normalizedPageSize);
    setPageSizeInput(normalizedPageSize);
    setPage(1);
  }

  function restorePageSizeInput() {
    if (!pageSizeInput) {
      setPageSizeInput(pageSize);
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <section className="clothes-gallery-filter-panel clothes-gallery-filters mb-3 flex shrink-0 flex-col gap-2.5 rounded-lg border p-2.5">
        <div className="grid grid-cols-[auto_minmax(220px,1fr)_auto_auto] items-center gap-2.5 max-[900px]:grid-cols-1">
          <Button
            className={cn(
              "clothes-gallery-filter-toggle h-8 justify-start px-3",
              {
                "is-active": isFilterButtonActive,
              },
            )}
            hidden={!hasAdvancedControls}
            icon={<FilterOutlined />}
            onClick={toggleAdvancedFilters}
          >
            <span>筛选</span>
            <span className="clothes-gallery-filter-count ml-1.5">
              {filteredClothes.length}/{clothes.length}
            </span>
          </Button>
          <Input
            allowClear
            className="clothes-gallery-search w-75!"
            onChange={changeKeyword}
            onCompositionEnd={finishKeywordComposition}
            onCompositionStart={startKeywordComposition}
            placeholder={`搜索${itemLabel}名称`}
            prefix={<SearchOutlined />}
            value={keywordDraft}
          />
          <Button
            className="h-8 justify-self-end max-[900px]:justify-self-start"
            onClick={openClothesCreateModal}
            type="primary"
          >
            新增
          </Button>
          <div className="flex items-center justify-end gap-2 max-[900px]:justify-start">
            <Segmented<ClothesViewMode>
              className="shrink-0"
              onChange={changeViewMode}
              options={viewModeOptions.map((option) => ({
                label: (
                  <span
                    aria-label={option.label}
                    className="inline-flex w-6 items-center justify-center"
                    title={option.label}
                  >
                    {option.icon}
                  </span>
                ),
                value: option.value,
              }))}
              value={viewMode}
            />
          </div>
        </div>
        {shouldShowFilterDetails ? (
          <div className="clothes-gallery-filter-details grid grid-cols-[minmax(260px,1fr)_minmax(240px,280px)_200px] gap-x-2.5 gap-y-2 border-t pt-2.5 max-[900px]:grid-cols-1">
            {hasSeason ? (
              <div className="clothes-gallery-season-row flex h-8 min-w-0 items-center gap-3 whitespace-nowrap">
                <Typography.Text className="clothes-gallery-filter-label shrink-0">
                  季节
                </Typography.Text>
                <Checkbox.Group
                  className="clothes-gallery-season-filter flex flex-nowrap gap-2.5"
                  onChange={(nextSeasons) =>
                    filterSeason(nextSeasons as string[])
                  }
                  options={seasonOptions}
                  value={selectedSeason}
                />
              </div>
            ) : null}
            {hasDate ? (
              <RangePicker
                allowClear
                allowEmpty
                className="clothes-gallery-time-filter h-8 w-full max-[900px]:max-w-90"
                onChange={filterTimeRange}
                placeholder={["购买开始", "购买结束"]}
                value={timeRange}
              />
            ) : null}
            {hasPrice ? (
              <div className="clothes-gallery-price-row col-start-3 flex h-8 min-w-0 items-center gap-1.75 max-[900px]:col-auto">
                <Typography.Text className="clothes-gallery-filter-label shrink-0">
                  价格
                </Typography.Text>
                <InputNumber
                  className="clothes-gallery-price-input h-8 w-17.5"
                  controls={false}
                  min={0}
                  onChange={filterMinPrice}
                  placeholder="最低价格"
                  precision={2}
                  value={priceRange[0]}
                />
                <span className="clothes-gallery-price-separator">-</span>
                <InputNumber
                  className="clothes-gallery-price-input h-8 w-17.5"
                  controls={false}
                  min={0}
                  onChange={filterMaxPrice}
                  placeholder="最高价格"
                  precision={2}
                  value={priceRange[1]}
                />
              </div>
            ) : null}
            {availableSortOptions.length ? (
              <Select<ClothesSortRule>
                className="clothes-gallery-sort-select theme-texture-select col-start-1 w-65 max-w-full max-[900px]:max-w-90"
                getPopupContainer={(triggerNode) =>
                  triggerNode.closest(".clothes-gallery-filters") ??
                  document.body
                }
                classNames={{
                  popup: {
                    root: "clothes-gallery-sort-popup theme-texture-select-popup",
                  },
                }}
                onChange={changeSortRule}
                options={availableSortOptions}
                popupMatchSelectWidth={false}
                value={effectiveSortRule}
              />
            ) : null}
            <Button
              className="clothes-gallery-reset-button col-start-3 h-8 justify-self-end px-2 max-[900px]:col-auto max-[900px]:justify-self-start"
              disabled={!canResetFilters}
              onClick={resetFilters}
              size="small"
              type="text"
            >
              重置
            </Button>
          </div>
        ) : null}
      </section>

      {pagedClothes.length && viewMode === "card" ? (
        <div className="clothes-gallery-card-grid flex min-h-0 flex-1 flex-wrap content-start gap-3 overflow-auto pr-1">
          {pagedClothes.map((item) => (
            <ClothesImageCard
              highlightIndexes={
                matchClothesNameSearch(item.name, keyword).highlightIndexes
              }
              item={item}
              key={item.c_id}
              onEdit={openClothesEditModal}
              showCount={showCount}
            />
          ))}
        </div>
      ) : pagedClothes.length ? (
        <div
          className="clothes-gallery-detail-list grid min-h-0 flex-1 content-start gap-0.5 overflow-auto"
          role="list"
        >
          {pagedClothes.map((item) => (
            <article
              className="clothes-gallery-detail-list-item min-h-7 rounded-md border px-2 py-1"
              key={item.c_id}
              role="listitem"
            >
              <div className="clothes-gallery-detail-row grid w-full min-w-0 grid-cols-[repeat(4,minmax(0,1fr))_32px] items-center gap-2 leading-4.5">
                <div className="clothes-gallery-detail-name-cell flex min-w-0 items-center gap-2">
                  {hasColor && item.color ? (
                    <span
                      className="clothes-gallery-detail-color h-2.5 w-2.5 rounded-full border"
                      style={{ backgroundColor: item.color }}
                    />
                  ) : null}
                  <Typography.Text
                    className="clothes-gallery-detail-name overflow-hidden text-ellipsis whitespace-nowrap leading-4.5"
                    strong
                  >
                    {renderHighlightedClothesName(
                      item.name,
                      matchClothesNameSearch(item.name, keyword)
                        .highlightIndexes,
                    )}
                  </Typography.Text>
                </div>
                {hasPrice ? (
                  <Typography.Text className="clothes-gallery-detail-meta overflow-hidden text-ellipsis whitespace-nowrap leading-4.5">
                    ¥{(item.price ?? 0).toFixed(2)}
                  </Typography.Text>
                ) : null}
                {hasDate ? (
                  <Typography.Text className="clothes-gallery-detail-meta overflow-hidden text-ellipsis whitespace-nowrap leading-4.5">
                    购买时间：{dayjs(item.timeStamp).format("YYYY-MM-DD")}
                  </Typography.Text>
                ) : null}
                {hasBookCategory || itemCategoryLabels ? (
                  <Typography.Text className="clothes-gallery-detail-meta overflow-hidden text-ellipsis whitespace-nowrap leading-4.5">
                    分类：
                    {getItemCategoryLabel(itemCategoryLabels, item.category) ||
                      "未分类"}
                  </Typography.Text>
                ) : null}
                {showCount ? (
                  <Typography.Text className="clothes-gallery-detail-meta overflow-hidden text-ellipsis whitespace-nowrap leading-4.5">
                    数量：{item.count ?? 1}
                  </Typography.Text>
                ) : null}
                {hasSeason ? (
                  <Typography.Text className="clothes-gallery-detail-meta overflow-hidden text-ellipsis whitespace-nowrap leading-4.5">
                    适合季节：{parseClothesSeasons(item.season ?? "").join(" ")}
                  </Typography.Text>
                ) : null}
                <span className="clothes-gallery-detail-action-cell flex justify-end">
                  {item.url ? (
                    <Button
                      aria-label={`打开 ${item.name}`}
                      className="clothes-gallery-detail-download-button"
                      href={item.url}
                      icon={<LinkOutlined />}
                      rel="noreferrer"
                      shape="circle"
                      size="small"
                      target="_blank"
                      type="text"
                    />
                  ) : null}
                  {item.download_url ? (
                    <Button
                      aria-label={`下载 ${item.name}`}
                      className="clothes-gallery-detail-download-button"
                      href={item.download_url}
                      icon={<DownloadOutlined />}
                      rel="noreferrer"
                      shape="circle"
                      size="small"
                      target="_blank"
                      type="text"
                    />
                  ) : null}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Empty
            description={emptyDescription}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {!hasFilter ? (
              <Button
                className="px-0 text-(--home-theme-color)!"
                onClick={openClothesCreateModal}
                type="link"
              >
                添加第一{itemLabel === "裤子" ? "条" : "件"}
                {itemLabel}
              </Button>
            ) : null}
          </Empty>
        </div>
      )}

      <div className="clothes-gallery-pagination flex shrink-0 flex-wrap items-center justify-end gap-2 pt-3">
        <span className="clothes-gallery-page-size-label">每页</span>
        <InputNumber
          className="clothes-gallery-page-size-input"
          controls={false}
          max={maxPageSize}
          min={1}
          onBlur={restorePageSizeInput}
          onChange={changePageSize}
          precision={0}
          size="small"
          value={pageSizeInput}
        />
        <span className="clothes-gallery-page-size-label">条</span>
        <Pagination
          current={safePage}
          disabled={!filteredClothes.length}
          onChange={setPage}
          pageSize={pageSize}
          showSizeChanger={false}
          size="small"
          total={filteredClothes.length}
        />
      </div>
    </div>
  );
}

/** 衣服图片卡片，保持正方形图片并在左下角显示名称。 */
function ClothesImageCard({
  highlightIndexes,
  item,
  onEdit,
  showCount,
}: {
  /** 衣服名称中被搜索命中的字符下标。 */
  highlightIndexes: Set<number>;
  /** 衣服文章推荐。 */
  item: ClothesItem;
  /** 编辑衣服文章推荐。 */
  onEdit: (item: ClothesItem) => void;
  /** 是否展示数量。 */
  showCount: boolean;
}) {
  const itemImageUrls = getItemImageUrls(item);
  const coverImageUrl = itemImageUrls[0];
  const hasImage = Boolean(coverImageUrl);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  function openImagePreview(event: React.MouseEvent<HTMLElement>) {
    event.stopPropagation();
    setPreviewIndex(0);
    setPreviewOpen(true);
  }

  return (
    <article
      className="clothes-gallery-card group relative aspect-square flex-[0_0_calc((100%-36px)/4)] overflow-hidden rounded-lg border bg-[color-mix(in_srgb,var(--home-theme-bg)_92%,#ffffff_8%)] max-[900px]:flex-[0_0_calc((100%-12px)/2)]"
      style={{
        borderColor:
          "color-mix(in srgb, var(--home-theme-color) 30%, transparent)",
      }}
    >
      {hasImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={item.name}
            className="absolute inset-0 block h-full w-full cursor-zoom-in object-cover transition-transform duration-300 ease-out group-hover:scale-120"
            onClick={(event) => openImagePreview(event)}
            src={coverImageUrl}
          />
          <Image.PreviewGroup
            items={itemImageUrls}
            preview={{
              current: previewIndex,
              onChange: (current) => setPreviewIndex(current),
              onOpenChange: (open) => setPreviewOpen(open),
              open: previewOpen,
            }}
          />
          <div className="absolute inset-x-0 bottom-0 flex min-h-11 max-w-full items-end bg-[linear-gradient(180deg,transparent,rgb(0_0_0/64%))] p-2.5">
            <Typography.Text
              className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-[color-mix(in_srgb,var(--home-theme-color)_42%,transparent)] px-2 py-1"
              style={{ color: "rgb(255 255 255 / 92%)" }}
            >
              {renderHighlightedClothesName(item.name, highlightIndexes)}
            </Typography.Text>
          </div>
        </>
      ) : (
        <div className="clothes-gallery-card-placeholder absolute inset-0 flex items-center justify-center p-4 text-center">
          <Typography.Text
            className="line-clamp-3 text-base font-medium leading-6"
            style={{ color: "var(--home-theme-text)" }}
          >
            {renderHighlightedClothesName(item.name, highlightIndexes)}
          </Typography.Text>
        </div>
      )}
      {showCount ? (
        <span className="clothes-gallery-card-count-badge absolute left-2.5 top-2.5 z-9 max-w-[calc(100%-20px)] overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold leading-4.5">
          x{item.count ?? 1}
        </span>
      ) : null}
      {itemImageUrls.length > 1 ? (
        <span className="clothes-gallery-card-count-badge clothes-gallery-card-image-count absolute left-auto right-2.5 top-2.5 z-9 max-w-[calc(100%-20px)] overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold leading-4.5">
          {itemImageUrls.length}
        </span>
      ) : null}
      {item.download_url ? (
        <Button
          aria-label={`下载 ${item.name}`}
          className="clothes-gallery-card-download-button clothes-gallery-card-edit-button absolute bottom-2.5 right-12.5 z-10 inline-flex size-8! items-center justify-center overflow-hidden rounded-full p-0 leading-none opacity-0 transition-[opacity,background-color,border-color] duration-180 ease-out group-hover:opacity-86"
          href={item.download_url}
          icon={<DownloadOutlined />}
          rel="noreferrer"
          shape="circle"
          size="small"
          target="_blank"
          type="primary"
        />
      ) : null}
      {item.url ? (
        <Button
          aria-label={`打开 ${item.name}`}
          className="clothes-gallery-card-download-button clothes-gallery-card-edit-button absolute bottom-2.5 right-12.5 z-10 inline-flex size-8! items-center justify-center overflow-hidden rounded-full p-0 leading-none opacity-0 transition-[opacity,background-color,border-color] duration-180 ease-out group-hover:opacity-86"
          href={item.url}
          icon={<LinkOutlined />}
          rel="noreferrer"
          shape="circle"
          size="small"
          target="_blank"
          type="primary"
        />
      ) : null}
      <Button
        aria-label={`编辑 ${item.name}`}
        className="clothes-gallery-card-edit-button absolute bottom-2.5 right-2.5 z-10 inline-flex size-8! items-center justify-center overflow-hidden rounded-full p-0 leading-none opacity-0 transition-[opacity,background-color,border-color] duration-180 ease-out group-hover:opacity-86"
        icon={<EditOutlined />}
        onClick={() => onEdit(item)}
        shape="circle"
        size="small"
        type="primary"
      />
    </article>
  );
}
