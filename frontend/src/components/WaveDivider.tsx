interface WaveDividerProps {
  position?: 'top' | 'bottom';
  color?: string;
  className?: string;
}

export default function WaveDivider({
  position = 'bottom',
  color = '#f8fafc',
  className = '',
}: WaveDividerProps) {
  const viewBox = '0 0 1200 120';
  const preserveAspectRatio = 'none';

  if (position === 'top') {
    return (
      <svg
        viewBox={viewBox}
        preserveAspectRatio={preserveAspectRatio}
        className={`w-full h-24 ${className}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,40 Q300,0 600,40 T1200,40 L1200,0 L0,0 Z"
          fill={color}
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      className={`w-full h-24 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0,40 Q300,80 600,40 T1200,40 L1200,120 L0,120 Z"
        fill={color}
      />
    </svg>
  );
}
