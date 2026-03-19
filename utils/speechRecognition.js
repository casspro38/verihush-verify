import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useState, useRef, useCallback } from 'react';

const COUNTRY_LANG_MAP = {
  KR: 'ko-KR',
  US: 'en-US',
  GB: 'en-GB',
  CA: 'en-CA',
  AU: 'en-AU',
  NZ: 'en-NZ',
  JP: 'ja-JP',
  SG: 'en-SG',
  IE: 'en-IE',
};

const THREAT_KEYWORDS = {
  'ko-KR': ['죽여', '죽일', '때려', '때릴', '협박', '신고', '경찰', '폭행', '살려', '도와줘', '그만해', '하지마'],
  'en-US': ['kill', 'threat', 'hurt', 'police', 'help', 'stop', 'assault', 'attack', 'gun', 'knife', 'die'],
  'en-GB': ['kill', 'threat', 'hurt', 'police', 'help', 'stop', 'assault', 'attack'],
  'en-CA': ['kill', 'threat', 'hurt', 'police', 'help', 'stop', 'assault', 'attack'],
  'en-AU': ['kill', 'threat', 'hurt', 'police', 'help', 'stop', 'assault', 'attack'],
  'ja-JP': ['殺す', '脅迫', '暴力', '警察', '助けて', 'やめて', '殴る'],
};

function detectKeywords(text, lang) {
  if (!text) return [];
  const keywords = THREAT_KEYWORDS[lang] || THREAT_KEYWORDS['en-US'];
  const lowerText = text.toLowerCase();
  return keywords.filter(keyword => lowerText.includes(keyword.toLowerCase()));
}

export function useSpeechRecognition({ countryCode, onKeywordDetected } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [fullTranscript, setFullTranscript] = useState('');
  const [currentInterim, setCurrentInterim] = useState('');
  const [detectedKeywords, setDetectedKeywords] = useState([]);
  const [error, setError] = useState(null);

  const fullTextRef = useRef('');
  const isStoppingRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const langRef = useRef(COUNTRY_LANG_MAP[countryCode] || 'en-US');

  const updateLanguage = useCallback((newCountryCode) => {
    langRef.current = COUNTRY_LANG_MAP[newCountryCode] || 'en-US';
  }, []);

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    if (shouldRestartRef.current && !isStoppingRef.current) {
      setTimeout(() => {
        if (shouldRestartRef.current) {
          startEngine();
        }
      }, 300);
    } else {
      setIsListening(false);
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    if (event.isFinal) {
      const separator = fullTextRef.current ? ' ' : '';
      fullTextRef.current = fullTextRef.current + separator + text;
      setFullTranscript(fullTextRef.current);
      setCurrentInterim('');
      const found = detectKeywords(text, langRef.current);
      if (found.length > 0) {
        setDetectedKeywords(prev => [
          ...prev,
          { keywords: found, text, timestamp: new Date().toISOString() },
        ]);
        if (onKeywordDetected) {
          onKeywordDetected(found, text);
        }
      }
    } else {
      setCurrentInterim(text);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('STT error:', event.error);
    if (event.error === 'no-speech' && shouldRestartRef.current) {
      setTimeout(() => {
        if (shouldRestartRef.current) {
          startEngine();
        }
      }, 300);
      return;
    }
    setError(event.error);
    setIsListening(false);
  });

  function startEngine() {
    try {
      ExpoSpeechRecognitionModule.start({
        lang: langRef.current,
        interimResults: true,
        continuous: true,
      });
    } catch (e) {
      console.log('STT start error:', e.message);
    }
  }

  const start = useCallback(async () => {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setError('permission_denied');
      return false;
    }
    isStoppingRef.current = false;
    shouldRestartRef.current = true;
    fullTextRef.current = '';
    setFullTranscript('');
    setCurrentInterim('');
    setDetectedKeywords([]);
    setError(null);
    startEngine();
    return true;
  }, []);

  const stop = useCallback(() => {
    isStoppingRef.current = true;
    shouldRestartRef.current = false;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (e) {
      console.log('STT stop error:', e.message);
    }
    setIsListening(false);
  }, []);

  const getDisplayText = useCallback(() => {
    if (currentInterim) {
      return fullTranscript ? fullTranscript + ' ' + currentInterim : currentInterim;
    }
    return fullTranscript;
  }, [fullTranscript, currentInterim]);

  const reset = useCallback(() => {
    fullTextRef.current = '';
    setFullTranscript('');
    setCurrentInterim('');
    setDetectedKeywords([]);
    setError(null);
  }, []);

  return {
    isListening,
    fullTranscript,
    currentInterim,
    detectedKeywords,
    error,
    start,
    stop,
    reset,
    getDisplayText,
    updateLanguage,
    lang: langRef.current,
  };
}


