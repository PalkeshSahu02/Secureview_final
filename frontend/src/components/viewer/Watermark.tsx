import React from 'react';
import { WatermarkData } from '../../types';

interface WatermarkProps {
  data: WatermarkData;
}

const Watermark: React.FC<WatermarkProps> = ({ data }) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Generate repeating diagonal watermark text
  const diagonalText = `${data.user_name} • ${data.user_email} • ${formatTime(data.timestamp)}`;

  return (
    <>
      {/* Corner watermarks */}
      {/* Top Right */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white text-xs p-3 rounded-lg pointer-events-none z-10">
        <div className="space-y-0.5">
          <p className="font-medium">{data.user_name}</p>
          <p className="opacity-80">{data.user_email}</p>
          {data.employee_id && <p className="opacity-80">ID: {data.employee_id}</p>}
          <p className="opacity-80">{data.organization}</p>
        </div>
      </div>

      {/* Bottom Left */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white text-xs p-3 rounded-lg pointer-events-none z-10">
        <div className="space-y-0.5">
          <p className="opacity-80">{data.location}</p>
          <p className="opacity-80">IP: {data.ip_address}</p>
          <p className="opacity-80">{formatTime(data.timestamp)}</p>
        </div>
      </div>

      {/* Diagonal repeating watermark */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden z-5"
        style={{ opacity: 0.08 }}
      >
        <div
          className="absolute w-[200%] h-[200%]"
          style={{
            transform: 'rotate(-30deg) translate(-25%, -25%)',
          }}
        >
          {Array.from({ length: 20 }).map((_, rowIndex) => (
            <div key={rowIndex} className="whitespace-nowrap mb-16">
              {Array.from({ length: 5 }).map((_, colIndex) => (
                <span
                  key={colIndex}
                  className="inline-block text-black text-lg font-bold mx-8"
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  {diagonalText}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Center watermark */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-5"
        style={{ opacity: 0.05 }}
      >
        <div className="text-center text-black">
          <p className="text-4xl font-bold">{data.user_name}</p>
          <p className="text-2xl">{data.user_email}</p>
          <p className="text-xl">{formatTime(data.timestamp)}</p>
        </div>
      </div>
    </>
  );
};

export default Watermark;
