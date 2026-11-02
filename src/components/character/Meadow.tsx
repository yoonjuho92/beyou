/**
 * 화면 아래를 가로로 꽉 채우는 픽셀 풀밭. 외부 에셋 없이 SVG 패턴으로 그린다 (1픽셀 = 4px).
 * 부모(relative) 안에서 absolute로 깔린다.
 */
const FLOWERS = [
  { left: '6%', top: '14%', color: '#f6a6b2' },
  { left: '19%', top: '42%', color: '#ffffff' },
  { left: '33%', top: '22%', color: '#f4c95d' },
  { left: '47%', top: '58%', color: '#f6a6b2' },
  { left: '58%', top: '18%', color: '#ffffff' },
  { left: '71%', top: '40%', color: '#f4c95d' },
  { left: '84%', top: '16%', color: '#f6a6b2' },
  { left: '92%', top: '55%', color: '#ffffff' },
  { left: '11%', top: '68%', color: '#f4c95d' },
  { left: '78%', top: '72%', color: '#f6a6b2' },
];

export function Meadow({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none select-none ${className}`}>
      <svg className="absolute inset-0 h-full w-full" shapeRendering="crispEdges">
        <defs>
          {/* 지평선의 들쭉날쭉한 풀잎 */}
          <pattern id="meadow-blades" width="32" height="16" patternUnits="userSpaceOnUse">
            <rect x="0" y="8" width="4" height="8" fill="#7cc96b" />
            <rect x="0" y="4" width="4" height="4" fill="#a6e08f" />
            <rect x="4" y="12" width="4" height="4" fill="#7cc96b" />
            <rect x="8" y="12" width="4" height="4" fill="#7cc96b" />
            <rect x="12" y="4" width="4" height="12" fill="#7cc96b" />
            <rect x="12" y="0" width="4" height="4" fill="#a6e08f" />
            <rect x="16" y="12" width="4" height="4" fill="#7cc96b" />
            <rect x="20" y="8" width="4" height="8" fill="#7cc96b" />
            <rect x="24" y="12" width="4" height="4" fill="#7cc96b" />
            <rect x="28" y="8" width="4" height="8" fill="#7cc96b" />
            <rect x="28" y="4" width="4" height="4" fill="#a6e08f" />
          </pattern>
          {/* 풀밭 속 짧은 풀 무늬 */}
          <pattern id="meadow-tufts" width="48" height="36" patternUnits="userSpaceOnUse">
            <rect width="48" height="36" fill="#7cc96b" />
            <rect x="4" y="8" width="4" height="4" fill="#5fae52" />
            <rect x="8" y="4" width="4" height="8" fill="#5fae52" />
            <rect x="28" y="24" width="4" height="4" fill="#5fae52" />
            <rect x="32" y="20" width="4" height="8" fill="#5fae52" />
            <rect x="40" y="4" width="4" height="4" fill="#a6e08f" />
            <rect x="16" y="28" width="4" height="4" fill="#a6e08f" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height="16" fill="url(#meadow-blades)" />
        <rect x="0" y="16" width="100%" height="100%" fill="url(#meadow-tufts)" />
        <rect x="0" y="16" width="100%" height="4" fill="#5fae52" />
      </svg>
      {FLOWERS.map((f) => (
        <svg
          key={`${f.left}-${f.top}`}
          viewBox="0 0 3 3"
          width={12}
          height={12}
          shapeRendering="crispEdges"
          className="absolute"
          style={{ left: f.left, top: f.top }}
        >
          <rect x="1" y="0" width="1" height="1" fill={f.color} />
          <rect x="0" y="1" width="1" height="1" fill={f.color} />
          <rect x="2" y="1" width="1" height="1" fill={f.color} />
          <rect x="1" y="2" width="1" height="1" fill={f.color} />
          <rect x="1" y="1" width="1" height="1" fill="#f4c95d" />
        </svg>
      ))}
    </div>
  );
}
