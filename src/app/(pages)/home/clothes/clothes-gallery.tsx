"use client";

import { useHomeContentActions } from "@/app/(pages)/home/home-view";
import { cn } from "@/lib/utils";
import {
  AppstoreOutlined,
  BarsOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Pagination,
  Segmented,
  Select,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState, type ReactNode } from "react";
import type { ClothesItem } from "./clothes-type";

type ClothesViewMode = "card" | "detail";

/** 衣服陈列组件接收的属性。 */
type ClothesGalleryProps = {
  /** 衣服物品列表。 */
  clothes: ClothesItem[];
};

const { RangePicker } = DatePicker;
const pageSize = 8;

const viewModeOptions: Array<{
  icon: ReactNode;
  label: string;
  value: ClothesViewMode;
}> = [
  { icon: <AppstoreOutlined />, label: "卡片视图", value: "card" },
  { icon: <BarsOutlined />, label: "详细信息", value: "detail" },
];

/** 衣服页陈列面板，负责搜索、筛选、分页和视图切换。 */
export function ClothesGallery({ clothes }: ClothesGalleryProps) {
  const { openClothesCreateModal } = useHomeContentActions();
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [priceRange, setPriceRange] = useState<[number | null, number | null]>([
    null,
    null,
  ]);
  const [selectedSeason, setSelectedSeason] = useState<string>();
  const [timeRange, setTimeRange] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);
  const [viewMode, setViewMode] = useState<ClothesViewMode>("card");
  const normalizedKeyword = keyword.trim().toLowerCase();
  const seasonOptions = useMemo(
    () =>
      Array.from(
        new Set(clothes.map((item) => item.season).filter(Boolean)),
      ).map((season) => ({
        label: season,
        value: season,
      })),
    [clothes],
  );
  const filteredClothes = useMemo(
    () =>
      clothes.filter((item) => {
        const purchaseDate = dayjs(item.timeStamp);
        const [startDate, endDate] = timeRange;
        const [minPrice, maxPrice] = priceRange;
        const matchesKeyword = [item.name, item.season, item.timeStamp]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(normalizedKeyword));
        const matchesSeason = selectedSeason
          ? item.season === selectedSeason
          : true;
        const matchesTime =
          (!startDate ||
            purchaseDate.isSame(startDate, "day") ||
            purchaseDate.isAfter(startDate, "day")) &&
          (!endDate ||
            purchaseDate.isSame(endDate, "day") ||
            purchaseDate.isBefore(endDate, "day"));
        const matchesPrice =
          (minPrice === null || item.price >= minPrice) &&
          (maxPrice === null || item.price <= maxPrice);

        return matchesKeyword && matchesSeason && matchesTime && matchesPrice;
      }),
    [clothes, normalizedKeyword, priceRange, selectedSeason, timeRange],
  );
  const totalPages = Math.max(1, Math.ceil(filteredClothes.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedClothes = filteredClothes.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  const hasFilter =
    Boolean(normalizedKeyword) ||
    Boolean(selectedSeason) ||
    priceRange.some((value) => value !== null) ||
    timeRange.some(Boolean);
  const emptyDescription = hasFilter ? "没有匹配的衣服" : "还没有衣服物品";

  /** 搜索衣服名称、季节或日期，参数 nextKeyword 为输入框最新值。 */
  function searchClothes(nextKeyword: string) {
    setKeyword(nextKeyword);
    setPage(1);
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
  function filterSeason(nextSeason?: string) {
    setSelectedSeason(nextSeason);
    setPage(1);
  }

  /** 切换衣服陈列视图，参数 nextMode 为卡片或详细信息视图。 */
  function changeViewMode(nextMode: ClothesViewMode) {
    setViewMode(nextMode);
    setPage(1);
  }

  return (
    <div className="clothes-gallery flex h-full min-h-0 w-full flex-col">
      <div className="clothes-gallery-toolbar">
        <Input
          allowClear
          className="clothes-gallery-search"
          onChange={(event) => searchClothes(event.target.value)}
          placeholder="搜索衣服名称、季节或日期"
          prefix={<SearchOutlined />}
          value={keyword}
        />
        <Segmented<ClothesViewMode>
          className="clothes-gallery-view-switch"
          onChange={changeViewMode}
          options={viewModeOptions.map((option) => ({
            label: (
              <span
                aria-label={option.label}
                className="clothes-gallery-view-option"
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

      <div className="clothes-gallery-filters">
        <RangePicker
          allowClear
          allowEmpty
          className="clothes-gallery-time-filter"
          onChange={filterTimeRange}
          placeholder={["购买开始", "购买结束"]}
          value={timeRange}
        />
        <div className="clothes-gallery-price-filters">
          <InputNumber
            className="clothes-gallery-price-filter"
            controls={false}
            min={0}
            onChange={filterMinPrice}
            placeholder="最低价格"
            precision={2}
            value={priceRange[0]}
          />
          <InputNumber
            className="clothes-gallery-price-filter"
            controls={false}
            min={0}
            onChange={filterMaxPrice}
            placeholder="最高价格"
            precision={2}
            value={priceRange[1]}
          />
        </div>
        <Select
          allowClear
          className="clothes-gallery-season-filter"
          onChange={filterSeason}
          options={seasonOptions}
          placeholder="季节"
          value={selectedSeason}
        />
      </div>

      {pagedClothes.length ? (
        <div
          className={cn("clothes-gallery-content", {
            "clothes-gallery-card-grid": viewMode === "card",
            "clothes-gallery-detail-list": viewMode === "detail",
          })}
        >
          {pagedClothes.map((item) =>
            viewMode === "card" ? (
              <ClothesImageCard item={item} key={item.c_id} />
            ) : (
              <ClothesDetailRow item={item} key={item.c_id} />
            ),
          )}
        </div>
      ) : (
        <div className="clothes-gallery-empty">
          <Empty
            description={emptyDescription}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {!hasFilter ? (
              <button
                className="clothes-gallery-empty-action"
                onClick={openClothesCreateModal}
                type="button"
              >
                添加第一件物品
              </button>
            ) : null}
          </Empty>
        </div>
      )}

      <div className="clothes-gallery-pagination">
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
  item,
}: {
  /** 衣服物品。 */
  item: ClothesItem;
}) {
  return (
    <article className="clothes-gallery-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={item.name} src={item.pic_url} />
      <div className="clothes-gallery-card-name">
        <Typography.Text>{item.name}</Typography.Text>
      </div>
    </article>
  );
}

/** 衣服详情行，只展示颜色和名称。 */
function ClothesDetailRow({
  item,
}: {
  /** 衣服物品。 */
  item: ClothesItem;
}) {
  return (
    <article className="clothes-gallery-detail-row">
      <span
        className="clothes-gallery-detail-color"
        style={{ backgroundColor: item.color }}
      />
      <Typography.Text className="clothes-gallery-detail-name">
        {item.name}
      </Typography.Text>
    </article>
  );
}
