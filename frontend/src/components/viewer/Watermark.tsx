import React from 'react';
import type { WatermarkData } from '../../types';

interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  city?: string;
  country?: string;
}

interface WatermarkProps {
  data: WatermarkData;
  geoLocation?: GeoLocation | null;
}

const Watermark: React.FC<WatermarkProps> = ({ data, geoLocation }) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Build watermark text with location
  const locationText = geoLocation
    ? `${geoLocation.latitude.toFixed(4)}, ${geoLocation.longitude.toFixed(4)}`
    : data.ip_address;

  const watermarkLine1 = data.user_email;
  const watermarkLine2 = `${formatTime(data.timestamp)} | ${locationText}`;

  return (
    <>
      {/* Diagonal repeating watermark - BOLD and VISIBLE */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden z-30"
        style={{ opacity: 0.25 }}
      >
        <div
          className="absolute w-[400%] h-[400%]"
          style={{
            transform: 'rotate(-30deg) translate(-25%, -25%)',
          }}
        >
          {Array.from({ length: 40 }).map((_, rowIndex) => (
            <div key={rowIndex} className="whitespace-nowrap mb-24">
              {Array.from({ length: 12 }).map((_, colIndex) => (
                <span
                  key={colIndex}
                  className="inline-block mx-16"
                  style={{
                    fontFamily: 'Arial Black, Arial, sans-serif',
                    fontSize: '16px',
                    fontWeight: 900,
                    color: '#000000',
                    letterSpacing: '0.5px',
                    textShadow: '0 0 1px rgba(0,0,0,0.3)',
                  }}
                >
                  {watermarkLine1}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Secondary diagonal pattern with timestamp and location */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden z-30"
        style={{ opacity: 0.18 }}
      >
        <div
          className="absolute w-[400%] h-[400%]"
          style={{
            transform: 'rotate(-30deg) translate(-20%, -35%)',
          }}
        >
          {Array.from({ length: 40 }).map((_, rowIndex) => (
            <div key={rowIndex} className="whitespace-nowrap mb-24">
              {Array.from({ length: 10 }).map((_, colIndex) => (
                <span
                  key={colIndex}
                  className="inline-block mx-20"
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#333333',
                    letterSpacing: '0.3px',
                  }}
                >
                  {watermarkLine2}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Large center watermark - VERY VISIBLE */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
        style={{ opacity: 0.15 }}
      >
        <div className="text-center text-black select-none" style={{ fontFamily: 'Arial Black, Arial, sans-serif' }}>
          <p style={{ fontSize: '72px', fontWeight: 900, letterSpacing: '-1px' }}>{data.user_name}</p>
          <p style={{ fontSize: '36px', fontWeight: 800, marginTop: '8px' }}>{data.user_email}</p>
          <p style={{ fontSize: '24px', fontWeight: 700, marginTop: '12px' }}>{formatTime(data.timestamp)}</p>
          {geoLocation && (
            <p style={{ fontSize: '20px', fontWeight: 600, marginTop: '8px', fontFamily: 'Consolas, monospace' }}>
              GPS: {geoLocation.latitude.toFixed(6)}, {geoLocation.longitude.toFixed(6)}
            </p>
          )}
          {(geoLocation?.city || geoLocation?.country) && (
            <p style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px' }}>
              {[geoLocation.city, geoLocation.country].filter(Boolean).join(', ')}
            </p>
          )}
          <p style={{ fontSize: '16px', fontWeight: 600, marginTop: '8px' }}>{data.ip_address}</p>
        </div>
      </div>

      {/* Corner watermarks - BOLD */}
      <div
        className="absolute top-4 left-4 z-30 select-none pointer-events-none"
        style={{
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '11px',
          fontWeight: 900,
          color: 'rgba(0,0,0,0.35)',
        }}
      >
        <div>{data.user_email}</div>
        <div style={{ fontSize: '10px', fontWeight: 700 }}>{formatTime(data.timestamp)}</div>
        {geoLocation && (
          <div style={{ fontSize: '9px', fontFamily: 'Consolas, monospace', fontWeight: 600 }}>
            {geoLocation.latitude.toFixed(4)}, {geoLocation.longitude.toFixed(4)}
          </div>
        )}
      </div>

      <div
        className="absolute top-4 right-4 z-30 select-none pointer-events-none text-right"
        style={{
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '11px',
          fontWeight: 900,
          color: 'rgba(0,0,0,0.35)',
        }}
      >
        <div>{data.user_name}</div>
        <div style={{ fontSize: '10px', fontWeight: 700 }}>{data.organization}</div>
        <div style={{ fontSize: '9px', fontWeight: 600 }}>{data.ip_address}</div>
      </div>

      <div
        className="absolute bottom-4 left-4 z-30 select-none pointer-events-none"
        style={{
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '11px',
          fontWeight: 900,
          color: 'rgba(0,0,0,0.35)',
        }}
      >
        <div>SECUREVIEW PROTECTED</div>
        <div style={{ fontSize: '9px', fontWeight: 600 }}>{data.employee_id || 'N/A'}</div>
      </div>

      <div
        className="absolute bottom-4 right-4 z-30 select-none pointer-events-none text-right"
        style={{
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '11px',
          fontWeight: 900,
          color: 'rgba(0,0,0,0.35)',
        }}
      >
        <div>{data.user_email}</div>
        {geoLocation && (
          <>
            <div style={{ fontSize: '9px', fontFamily: 'Consolas, monospace', fontWeight: 600 }}>
              {geoLocation.latitude.toFixed(6)}, {geoLocation.longitude.toFixed(6)}
            </div>
            {(geoLocation.city || geoLocation.country) && (
              <div style={{ fontSize: '9px', fontWeight: 600 }}>
                {[geoLocation.city, geoLocation.country].filter(Boolean).join(', ')}
              </div>
            )}
          </>
        )}
      </div>

      {/* Grid overlay pattern */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 80px,
            rgba(0,0,0,0.03) 80px,
            rgba(0,0,0,0.03) 81px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 80px,
            rgba(0,0,0,0.03) 80px,
            rgba(0,0,0,0.03) 81px
          )`,
        }}
      />
    </>
  );
};

export default Watermark;
