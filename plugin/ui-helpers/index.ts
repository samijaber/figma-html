import { BuilderElement } from "@builder.io/sdk";
import * as pako from "pako";
import * as traverse from "traverse";
import { fastClone } from "../functions/fast-clone";
import { apiHost } from "./dev";

export const selectionToBuilder = async (
  selection: SceneNode[]
): Promise<BuilderElement[]> => {
  const useGzip = true;

  selection = fastClone(selection);

  traverse(selection).forEach(function (item) {
    if (this.key === "intArr") {
      this.delete();
    }
  });

  const res = await fetch(`${apiHost}/api/v1/figma-to-builder`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(
      useGzip
        ? {
            compressedNodes: pako.deflate(JSON.stringify(selection), {
              to: "string",
            }),
          }
        : {
            nodes: selection,
          }
    ),
  }).then((res) => {
    if (!res.ok) {
      console.error("Figma-to-builder request failed", res);
      throw new Error("Figma-to-builder request failed");
    }
    return res.json();
  });
  return res.blocks;
};

export const apiKey = process.env.API_KEY || null;

export const clamp = (num: number, min: number, max: number) =>
  Math.max(min, Math.min(max, num));
