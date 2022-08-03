import * as fileType from "file-type";
import { transformWebpToPNG } from "../functions/encode-images";
import { apiHost } from "./dev";

// https://stackoverflow.com/a/46634877
type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export type Node = TextNode | RectangleNode;

const BASE64_MARKER = ";base64,";
function convertDataURIToBinary(dataURI: string) {
  const base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
  const base64 = dataURI.substring(base64Index);
  const raw = window.atob(base64);
  const rawLength = raw.length;
  const array = new Uint8Array(new ArrayBuffer(rawLength));

  for (let i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
}

export function getImageFills(layer: Node) {
  const images =
    Array.isArray(layer.fills) &&
    layer.fills
      .filter((item) => item.type === "IMAGE" && item.visible && item.opacity)
      .sort((a, b) => b.opacity - a.opacity);
  return images;
}

// TODO: CACHE!
// const imageCache: { [key: string]: Uint8Array | undefined } = {};
export async function processImages(layer: Node) {
  const images = getImageFills(layer);

  const convertToSvg = (value: string) => {
    (layer as any).type = "SVG";
    (layer as any).svg = value;
    if (typeof layer.fills !== "symbol") {
      layer.fills = layer.fills.filter((item) => item.type !== "IMAGE");
    }
  };
  if (!images) {
    return Promise.resolve([]);
  }

  type AugmentedImagePaint = Writeable<ImagePaint> & {
    intArr?: Uint8Array;
    url?: string;
  };

  return Promise.all(
    images.map(async (image: AugmentedImagePaint) => {
      try {
        if (!image?.url) {
          return;
        }

        const url = image.url;
        if (url.startsWith("data:")) {
          const type = url.split(/[:,;]/)[1];
          if (type.includes("svg")) {
            const svgValue = decodeURIComponent(url.split(",")[1]);
            convertToSvg(svgValue);
            return Promise.resolve();
          } else {
            if (url.includes(BASE64_MARKER)) {
              image.intArr = convertDataURIToBinary(url);
              delete image.url;
            } else {
              console.info("Found data url that could not be converted", url);
            }
            return;
          }
        }

        const isSvg = url.endsWith(".svg");

        // Proxy returned content through Builder so we can access cross origin for
        // pulling in photos, etc
        const res = await fetch(
          `${apiHost}/api/v1/proxy-api?url=${encodeURIComponent(url)}`
        );

        const contentType = res.headers.get("content-type");
        if (isSvg || contentType?.includes("svg")) {
          const text = await res.text();
          convertToSvg(text);
        } else {
          const arrayBuffer = await res.arrayBuffer();
          const type = fileType(arrayBuffer);
          if (type && (type.ext.includes("svg") || type.mime.includes("svg"))) {
            convertToSvg(await res.text());
            return;
          } else {
            const intArr = new Uint8Array(arrayBuffer);
            delete image.url;

            if (
              type &&
              (type.ext.includes("webp") || type.mime.includes("image/webp"))
            ) {
              const pngArr = await transformWebpToPNG(intArr);
              image.intArr = pngArr;
            } else {
              image.intArr = intArr;
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch image", layer, err);
      }
    })
  );
}
