// 漂浮的云层装饰：参考图风格的扁平瘤状白云缓慢平移，阴影紧贴云体投射在田野上
// 阴影与云在同一容器内，随云同步漂移

// 6 种不同的云形（viewBox 0 0 220 110），顶部瘤状起伏、底部平齐，取自参考图云朵造型
const SHAPES = [
  // 长条多瘤
  'M14 64 C6 64 2 54 12 48 C6 38 22 30 36 34 C38 20 60 12 76 22 C88 8 114 6 128 20 C146 10 170 18 172 34 C192 32 206 44 200 56 C208 64 198 70 182 70 L30 70 C20 70 15 68 14 64 Z',
  // 宽圆厚云
  'M30 74 C14 74 8 62 20 54 C12 42 30 32 46 38 C50 20 78 10 96 24 C116 12 144 22 144 42 C168 40 184 54 176 68 C170 78 152 78 140 76 L48 76 C40 76 33 76 30 74 Z',
  // 低扁宽云
  'M10 58 C2 58 0 48 10 44 C4 34 20 28 32 32 C34 20 54 14 68 22 C80 10 104 10 116 22 C132 14 154 20 156 34 C176 32 190 44 184 54 C176 62 158 60 144 60 L28 60 C20 60 13 60 10 58 Z',
  // 小团圆云
  'M50 70 C32 70 24 58 34 48 C26 36 44 26 58 32 C62 16 86 8 102 20 C118 10 140 20 138 38 C156 36 168 50 160 62 C168 70 158 74 144 74 L64 74 C58 74 53 72 50 70 Z',
  // 不对称翘尾
  'M16 62 C6 62 2 52 12 46 C6 36 22 28 36 32 C38 18 58 10 74 20 C86 6 112 4 126 18 C142 10 164 16 168 32 C188 30 202 40 198 52 C206 58 198 66 182 66 L40 66 C28 66 20 65 16 62 Z',
  // 双瘤厚云
  'M24 72 C10 72 4 60 16 52 C10 40 28 30 44 36 C48 18 76 8 94 22 C112 8 142 16 144 36 C166 34 182 48 174 62 C182 72 168 78 150 76 L42 76 C34 76 27 75 24 72 Z',
]

interface CloudSpec {
  shape: number // SHAPES 索引
  top: string // 距容器顶部百分比
  width: number // 云宽度 px
  duration: number // 漂完全程秒数
  delay: number // 负延迟 = 初始位置
  opacity?: number
}

const CLOUDS: CloudSpec[] = [
  { shape: 0, top: '5%', width: 126, duration: 110, delay: -18 },
  { shape: 1, top: '17%', width: 96, duration: 80, delay: -52 },
  { shape: 2, top: '31%', width: 138, duration: 135, delay: -96, opacity: 0.96 },
  { shape: 3, top: '49%', width: 72, duration: 92, delay: -30 },
  { shape: 4, top: '63%', width: 102, duration: 70, delay: -8, opacity: 0.94 },
  { shape: 5, top: '40%', width: 84, duration: 120, delay: -70, opacity: 0.92 },
]

function CloudSvg({
  width,
  path,
  fill,
  extraStyle,
}: {
  width: number
  path: string
  fill: string
  extraStyle?: React.CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 220 110"
      width={width}
      style={{ display: 'block', ...extraStyle }}
      aria-hidden="true"
    >
      <path d={path} fill={fill} />
    </svg>
  )
}

export default function CloudLayer() {
  const driftStyle = (c: CloudSpec): React.CSSProperties => ({
    top: c.top,
    animationDuration: `${c.duration}s`,
    animationDelay: `${c.delay}s`,
    opacity: c.opacity ?? 1,
  })

  return (
    <div
      className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
      aria-hidden="true"
    >
      {/* 阴影层：整体位于所有云体之下，云面上永远不会出现阴影 */}
      <div className="absolute inset-0">
        {CLOUDS.map((c, i) => (
          <div key={i} className="cloud-drift absolute left-0 w-full" style={driftStyle(c)}>
            <div style={{ width: c.width }}>
              <CloudSvg
                width={c.width * 0.92}
                path={SHAPES[c.shape]}
                fill="rgba(47, 84, 62, 0.1)"
                extraStyle={{
                  transform: 'translate(10px, 22px)',
                  filter: 'blur(2.5px)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 云体层：纯白无描边，位于阴影层之上 */}
      <div className="absolute inset-0">
        {CLOUDS.map((c, i) => (
          <div key={i} className="cloud-drift absolute left-0 w-full" style={driftStyle(c)}>
            <div style={{ width: c.width }}>
              <CloudSvg width={c.width} path={SHAPES[c.shape]} fill="#ffffff" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
