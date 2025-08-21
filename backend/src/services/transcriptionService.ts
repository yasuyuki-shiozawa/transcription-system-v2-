import fs from 'fs';
import OpenAI from 'openai';

interface SectionData {
  sectionNumber: string;
  speaker: string;
  timestamp: string;
  endTimestamp: string | null;
  content: string;
  order: number;
  isExcluded: boolean;
}

export class TranscriptionService {
  private openai: OpenAI | null = null;
  private retryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2
  };

  constructor() {
    // APIキーがある場合のみOpenAIクライアントを初期化
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== '') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async transcribeAudio(
    filePath: string,
    source: 'NOTTA' | 'MANUS'
  ): Promise<{ text: string; sections: SectionData[] }> {
    // APIキーがない場合はダミー転写結果を返す
    if (!this.openai) {
      return this.getDummyTranscription(source);
    }

    // let lastError: Error;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Validate API key
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
          throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in backend/.env');
        }

        // Validate file exists
        if (!fs.existsSync(filePath)) {
          throw new Error(`Audio file not found: ${filePath}`);
        }

        // Read the audio file
        const audioFile = fs.createReadStream(filePath);

        // Call Whisper API with timeout
        const transcription = await this.openai.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          response_format: 'verbose_json',
          language: 'ja'
        });

        // Convert to sections format
        const sections = this.parseWhisperResponse(transcription, source);

        return {
          text: transcription.text,
          sections,
        };
      } catch (error) {
        // lastError = error as Error;
        console.error(`Transcription attempt ${attempt}/${this.retryConfig.maxRetries} failed:`, error);
        
        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.message.includes('API key') || 
              error.message.includes('file not found') ||
              error.message.includes('authentication')) {
            throw error;
          }
        }
        
        // Wait before retry (except on last attempt)
        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Failed to transcribe audio after ${this.retryConfig.maxRetries} attempts`);
  }

  private parseWhisperResponse(
    transcriptionData: any,
    source: 'NOTTA' | 'MANUS'
  ): SectionData[] {
    const sections: SectionData[] = [];
    
    if (transcriptionData.segments) {
      transcriptionData.segments.forEach((segment: any, index: number) => {
        const sectionNumber = source === 'NOTTA' 
          ? `NOTTA_${(index + 1).toString().padStart(3, '0')}`
          : `${index + 1}`;

        sections.push({
          sectionNumber,
          speaker: '話者不明', // Speaker unknown - Whisper doesn't provide speaker info
          timestamp: this.formatTimestamp(segment.start),
          endTimestamp: this.formatTimestamp(segment.end),
          content: segment.text.trim(),
          order: index + 1,
          isExcluded: false,
        });
      });
    } else {
      // If no segments, create a single section
      sections.push({
        sectionNumber: source === 'NOTTA' ? 'NOTTA_001' : '1',
        speaker: '話者不明',
        timestamp: '00:00:00',
        endTimestamp: null,
        content: transcriptionData.text,
        order: 1,
        isExcluded: false,
      });
    }

    return sections;
  }

  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private getDummyTranscription(source: 'NOTTA' | 'MANUS'): { text: string; sections: SectionData[] } {
    const dummyText = "これはダミーの転写結果です。OpenAI APIキーが設定されていないため、実際の音声転写は行われていません。";
    
    const sections: SectionData[] = [
      {
        sectionNumber: source === 'NOTTA' ? 'NOTTA_001' : '1',
        speaker: 'システム',
        timestamp: '00:00:00',
        endTimestamp: '00:00:10',
        content: dummyText,
        order: 1,
        isExcluded: false,
      }
    ];

    return {
      text: dummyText,
      sections,
    };
  }
}