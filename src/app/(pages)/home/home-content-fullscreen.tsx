"use client";

import {
  FullscreenExitOutlined,
  FullscreenOutlined,
} from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

type HomeContentFullscreenContextValue = {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
};

const HomeContentFullscreenContext =
  createContext<HomeContentFullscreenContextValue | null>(null);

export function HomeContentFullscreenProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: HomeContentFullscreenContextValue;
}) {
  return (
    <HomeContentFullscreenContext.Provider value={value}>
      {children}
    </HomeContentFullscreenContext.Provider>
  );
}

export function HomeContentFullscreenButton() {
  const fullscreen = useContext(HomeContentFullscreenContext);

  if (!fullscreen) {
    return null;
  }

  const label = fullscreen.isFullscreen ? "退出放大" : "放大";

  return (
    <Tooltip title={label}>
      <Button
        aria-label={label}
        className="home-content-fullscreen-button"
        icon={
          fullscreen.isFullscreen ? (
            <FullscreenExitOutlined />
          ) : (
            <FullscreenOutlined />
          )
        }
        onClick={fullscreen.toggleFullscreen}
        size="small"
      />
    </Tooltip>
  );
}
