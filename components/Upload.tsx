import { CheckCircle2, ImageIcon, UploadIcon } from 'lucide-react';
import React from 'react';
import { useOutletContext } from 'react-router';
import {
  PROGRESS_INTERVAL_MS,
  PROGRESS_STEP,
  REDIRECT_DELAY_MS,
  MAX_FILE_SIZE,
} from '../lib/constants';

interface UploadProps {
  onComplete: (base64: string) => void;
}

function Upload({ onComplete }: UploadProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const intervalRef = React.useRef<number | null>(null);
  const timeoutRef = React.useRef<number | null>(null);

  const { isSignedIn } = useOutletContext<AuthContext>();

  // Clear both timers if the component unmounts mid-upload
  React.useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const processFile = (selectedFile: File) => {
    if (!isSignedIn) return;
    // Clear any existing timers from a previous upload
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // 10 MB
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File exceeds the 10 MB limit. Please choose a smaller image.');
      return;
    }
    setError(null);
    setFile(selectedFile);
    setProgress(0);
    const reader = new FileReader();

    reader.onerror = () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setProgress(0);
      setFile(null);
      setError('Failed to read the file. Please try again.');
      console.error('FileReader error:', reader.error);
    };

    reader.onload = () => {
      const base64 = reader.result as string;

      intervalRef.current = window.setInterval(() => {
        setProgress((prev) => {
          const next = prev + PROGRESS_STEP;

          if (next >= 100) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            timeoutRef.current = window.setTimeout(() => {
              onComplete(base64);
            }, REDIRECT_DELAY_MS);
            return 100;
          }

          return next;
        });
      }, PROGRESS_INTERVAL_MS);
    };

    reader.readAsDataURL(selectedFile);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isSignedIn) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isSignedIn) return;

    const dropped = e.dataTransfer.files?.[0];
    if (dropped) processFile(dropped);
  };

  return (
    <div className='upload'>
      {!file ? (
        <div
          className={`dropzone ${isDragging ? 'is-dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".jpg,.jpeg,.png"
            disabled={!isSignedIn}
            onChange={handleChange}
          />
          <div className="drop-content">
            <div className='drop-icon'><UploadIcon size={20} /></div>
            <p>
              {isSignedIn
                ? "Click to upload or just drag and drop"
                : "Sign in or sign up with Puter to upload"}
            </p>
            <p className='help'>Maximum file size 10MB</p>
          </div>
          {error && <p className='upload-error'>{error}</p>}
        </div>
      ) : (
        <div className='upload-status'>
          <div className='status-content'>
            <div className='status-icon'>
              {progress === 100
                ? <CheckCircle2 className='check' />
                : <ImageIcon className='image' />}
            </div>
            <h3>{file.name}</h3>
            <div className='progress'>
              <div className='bar' style={{ width: `${progress}%` }} />
              <p className='status-text'>
                {progress < 100 ? "Analyzing Floor Plan..." : "Redirecting..."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Upload;