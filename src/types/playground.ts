export type PlaygroundNodeType =
  | 'ingress'
  | 'loadBalancer'
  | 'server'
  | 'database'
  | 'cache'
  | 'queue'
  | 'worker';

export interface NodePosition {
  x: number;
  y: number;
}

export interface WireConnection {
  id: string;
  fromId: string;
  toId: string;
  fromHandle?: 'top' | 'right' | 'bottom' | 'left';
  toHandle?: 'top' | 'right' | 'bottom' | 'left';
  label?: string;
  protocol?: string;
  trafficLoad?: number; // 0 - 100 relative activity
}

export interface DraggingWire {
  fromNodeId: string;
  fromHandle: 'top' | 'right' | 'bottom' | 'left';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}
