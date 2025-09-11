'use client';
import dynamic from 'next/dynamic';

const VoiceAgent = dynamic(() => import('./ui/VoiceAgent'), { ssr: false });

export default function Home() {
  return (
    <div >
      <VoiceAgent />
    </div>
  );
}
