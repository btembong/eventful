'use client';

/**
 * ThinkingOrb — animated orb for loading/thinking states.
 * Matches the thinking-orbs npm package API: <ThinkingOrb state="thinking" size={48} />
 *
 * States:
 *   idle      — gentle static pulse
 *   listening — slow breathing rhythm
 *   thinking  — active swirling animation
 *   speaking  — outward ripple waves
 */

type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

const STATE_CONFIG: Record<OrbState, {
  duration: string;
  color: string;
  glowColor: string;
}> = {
  idle:      { duration: '3s',   color: '#F07200', glowColor: 'rgba(240,114,0,0.18)' },
  listening: { duration: '1.8s', color: '#F07200', glowColor: 'rgba(240,114,0,0.25)' },
  thinking:  { duration: '0.9s', color: '#F07200', glowColor: 'rgba(240,114,0,0.35)' },
  speaking:  { duration: '0.6s', color: '#F07200', glowColor: 'rgba(240,114,0,0.40)' },
};

export function ThinkingOrb({ state = 'thinking', size = 48 }: { state?: OrbState; size?: number }) {
  const cfg  = STATE_CONFIG[state];
  const half = size / 2;
  const r    = half * 0.42;
  const dur  = cfg.duration;
  const durF = parseFloat(dur);

  return (
    <span
      style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      aria-label={state}
      role="status"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        {/* Outermost ripple — wide slow fade */}
        <circle cx={half} cy={half} r={half * 0.5} stroke={cfg.color} strokeWidth={half * 0.05} strokeOpacity={0} fill="none">
          <animate attributeName="r"              values={`${half * 0.5};${half * 1.0};${half * 0.5}`} dur={dur} repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.5;0;0.5"                                    dur={dur} repeatCount="indefinite" />
        </circle>

        {/* Second ripple — offset by half cycle */}
        <circle cx={half} cy={half} r={half * 0.5} stroke={cfg.color} strokeWidth={half * 0.04} strokeOpacity={0} fill="none">
          <animate attributeName="r"              values={`${half * 0.5};${half * 0.9};${half * 0.5}`} dur={dur} begin={`${durF * 0.5}s`} repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.35;0;0.35"                                  dur={dur} begin={`${durF * 0.5}s`} repeatCount="indefinite" />
        </circle>

        {/* Glow halo */}
        <circle cx={half} cy={half} r={r * 1.55} fill={cfg.glowColor}>
          <animate attributeName="r"            values={`${r * 1.3};${r * 1.7};${r * 1.3}`} dur={dur} repeatCount="indefinite" />
          <animate attributeName="fill-opacity" values="0.6;1;0.6"                            dur={dur} repeatCount="indefinite" />
        </circle>

        {/* Core orb */}
        <circle cx={half} cy={half} r={r} fill={cfg.color}>
          <animate attributeName="r"            values={`${r * 0.88};${r * 1.08};${r * 0.88}`} dur={dur} repeatCount="indefinite" />
          <animate attributeName="fill-opacity" values="0.85;1;0.85"                              dur={dur} repeatCount="indefinite" />
        </circle>

        {/* Specular highlight */}
        <circle cx={half - r * 0.3} cy={half - r * 0.3} r={r * 0.30} fill="white" fillOpacity={0.45} />

        {/* Soft inner shine ring */}
        <circle cx={half} cy={half} r={r * 0.68} stroke="white" strokeWidth={half * 0.03} strokeOpacity={0.2} fill="none" />
      </svg>
    </span>
  );
}
