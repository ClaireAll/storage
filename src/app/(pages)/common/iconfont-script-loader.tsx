"use client";

import { useEffect } from "react";

const iconfontScriptId = "storage-iconfont-symbol-script";
const iconfontScriptSrc = "/iconfont/iconfont.js";

export function IconfontScriptLoader() {
  useEffect(() => {
    if (document.getElementById(iconfontScriptId)) {
      return;
    }

    const script = document.createElement("script");
    script.id = iconfontScriptId;
    script.src = iconfontScriptSrc;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return null;
}
