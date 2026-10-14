import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from "d3-force";
import type { AtlasGraph } from "./atlas-model";

/** 在工作线程内进行有界布局，固定节点不参与位置调整。 */
self.onmessage = (event: MessageEvent<AtlasGraph>) => {
  const graph = event.data;
  const points = graph.nodes.map((node) => ({
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    fx: node.fixed ? node.position.x : null,
    fy: node.fixed ? node.position.y : null,
    radius: node.image ? (node.width ?? 180) / 2 : 45,
  }));
  const links = graph.edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }));
  const simulation = forceSimulation(points)
    .force(
      "link",
      forceLink(links)
        .id((node) => (node as (typeof points)[number]).id)
        .distance(140),
    )
    .force("charge", forceManyBody().strength(-450))
    .force("center", forceCenter(450, 350))
    .force(
      "collision",
      forceCollide<(typeof points)[number]>().radius(
        (node) => node.radius + 25,
      ),
    )
    .stop();
  simulation.tick(180);
  simulation.stop();
  self.postMessage(
    points.map((point) => ({
      id: point.id,
      position: { x: point.x, y: point.y },
    })),
  );
};
