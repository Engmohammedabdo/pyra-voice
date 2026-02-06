'use client';

import { useEffect, useRef } from 'react';

interface WaveFormProps {
  getAnalyserData: () => Uint8Array | null;
  isActive: boolean;
  color?: string;
  barCount?: number;
}

export default function WaveForm({
  getAnalyserData,
  isActive,
  color = '#6C3AED',
  barCount = 24,
}: WaveFormProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        // Draw flat line when inactive
        const barWidth = width / barCount;
        for (let i = 0; i < barCount; i++) {
          const x = i * barWidth + barWidth * 0.15;
          const bw = barWidth * 0.7;
          ctx.fillStyle = `${color}33`;
          ctx.roundRect(x, height / 2 - 1, bw, 2, 1);
          ctx.fill();
        }
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const data = getAnalyserData();
      const barWidth = width / barCount;

      for (let i = 0; i < barCount; i++) {
        let value: number;
        if (data && data.length > 0) {
          // Map bar index to data index
          const dataIndex = Math.floor((i / barCount) * data.length);
          value = data[dataIndex] / 255;
        } else {
          // Fake waveform when no analyser data
          value = 0.3 + Math.sin(Date.now() / 200 + i * 0.5) * 0.3;
        }

        const barHeight = Math.max(2, value * height * 0.8);
        const x = i * barWidth + barWidth * 0.15;
        const y = (height - barHeight) / 2;
        const bw = barWidth * 0.7;

        // Gradient opacity based on position
        const centerDist = Math.abs(i - barCount / 2) / (barCount / 2);
        const opacity = 0.4 + (1 - centerDist) * 0.6;

        ctx.fillStyle =
          color === '#ef4444'
            ? `rgba(239, 68, 68, ${opacity})`
            : `rgba(108, 58, 237, ${opacity})`;
        ctx.beginPath();
        ctx.roundRect(x, y, bw, barHeight, bw / 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animRef.current);
  }, [isActive, getAnalyserData, color, barCount]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={48}
      className="w-60 h-12 opacity-80"
    />
  );
}
