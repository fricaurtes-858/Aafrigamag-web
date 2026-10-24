import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Pause, Play, Radio, Volume2, VolumeX } from 'lucide-react';

const STREAM_URL = 'https://stream.zeno.fm/2cczjytanegvv';
const STATION_NAME = 'El Sol 89';

type PlayerStatus = 'idle' | 'connecting' | 'playing' | 'paused' | 'error';

export default function RadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlaying = () => setStatus('playing');
    const handlePause = () => setStatus((prev) => (prev === 'error' ? 'error' : 'paused'));
    const handleWaiting = () => setStatus('connecting');
    const handleError = () => setStatus('error');
    const handleStalled = () => setStatus('connecting');

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted]);

  const handlePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (status === 'playing') {
      audio.pause();
      return;
    }

    setStatus('connecting');
    try {
      audio.src = STREAM_URL;
      audio.load();
      await audio.play();
    } catch {
      setStatus('error');
    }
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    setStatus('idle');
  };

  const statusLabel: Record<PlayerStatus, string> = {
    idle: 'Listo para reproducir',
    connecting: 'Conectando con la señal…',
    playing: 'EN VIVO',
    paused: 'En pausa',
    error: 'Señal temporalmente no disponible. Intenta nuevamente en unos minutos.',
  };

  const isLive = status === 'playing';
  const isError = status === 'error';

  return (
    <div className="radio-player-card">
      <audio ref={audioRef} preload="none" crossOrigin="anonymous" />

      <div className="radio-player-header">
        <div className="radio-live-badge" data-live={isLive}>
          <span className="radio-live-dot" />
          {statusLabel[status]}
        </div>
      </div>

      <div className="radio-player-body">
        <div className="radio-player-icon">
          <Radio size={32} />
        </div>

        <div className="radio-player-info">
          <strong>{STATION_NAME}</strong>
          <span>Plato, Magdalena · 89.0 FM</span>
        </div>

        <button
          className={`radio-play-btn ${isLive ? 'is-playing' : ''}`}
          onClick={handlePlay}
          disabled={status === 'connecting'}
          aria-label={isLive ? 'Pausar' : 'Reproducir'}
        >
          {status === 'connecting' ? (
            <span className="radio-spinner" />
          ) : isLive ? (
            <Pause size={24} fill="currentColor" />
          ) : (
            <Play size={24} fill="currentColor" />
          )}
        </button>
      </div>

      <div className="radio-player-controls">
        <button
          className="radio-volume-icon"
          onClick={() => setMuted(!muted)}
          aria-label={muted ? 'Activar sonido' : 'Silenciar'}
        >
          {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVolume(v);
            setMuted(v === 0);
          }}
          className="radio-volume-slider"
          aria-label="Volumen"
        />
        {status !== 'idle' && (
          <button className="radio-stop-btn" onClick={handleStop} aria-label="Detener">
            Detener
          </button>
        )}
      </div>

      {isError && (
        <div className="radio-error-msg">
          {statusLabel.error}
          <button className="radio-retry-btn" onClick={handlePlay}>
            Reintentar
          </button>
        </div>
      )}

      <div className="radio-player-footer">
        <span>Señal proporcionada por El Sol 89.0 FM vía Zeno.fm</span>
        <a href="https://elsol89.com/" target="_blank" rel="noreferrer" className="radio-ext-link">
          <ExternalLink size={13} /> Sitio oficial
        </a>
      </div>
    </div>
  );
}
