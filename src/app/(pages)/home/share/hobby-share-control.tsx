"use client";

import { ShareAltOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useState } from "react";
import { HobbyShareDialog } from "./hobby-share-dialog";

/** 首页爱好分享入口接收的主题内 portal 容器。 */
type HobbyShareControlProps = {
  portalHost: HTMLElement | null;
};

/** 首页标题栏中的爱好分享入口。 */
export function HobbyShareControl({ portalHost }: HobbyShareControlProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span className="home-hobby-share-control">
        <Tooltip title="分享爱好页面">
          <Button
            aria-label="分享爱好页面"
            className="home-hobby-share-trigger"
            icon={<ShareAltOutlined />}
            onClick={() => setOpen(true)}
            type="primary"
          />
        </Tooltip>
      </span>
      {portalHost ? (
        <HobbyShareDialog
          getContainer={portalHost}
          onClose={() => setOpen(false)}
          open={open}
        />
      ) : null}
    </>
  );
}
