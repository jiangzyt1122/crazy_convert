export type ErrorType = '事实性错误' | '推理错误' | '情感表达错误';
export type Severity = '低' | '中' | '高';

export interface AnnotationRange {
  startIndex: number;
  endIndex: number;
  text: string;
}

export interface Annotation {
  id: string;
  replyId: 'reply1' | 'reply2';
  startIndex: number;
  endIndex: number;
  text: string;
  ranges: AnnotationRange[];
  type: ErrorType;
  subType: string;
  reason: string;
  severity: Severity;
  hidden?: boolean;
}

export interface TextSegment {
  key: string;
  replyId: 'reply1' | 'reply2';
  startIndex: number;
  endIndex: number;
  text: string;
  annotationIds: string[];
  primaryAnnotationId: string | null;
  isOverlap: boolean;
  overlapCount: number;
}

export interface DraftAnnotation {
  replyId: 'reply1' | 'reply2';
  startIndex: number;
  endIndex: number;
  text: string;
  top: number;
  left: number;
  type: ErrorType;
  subType: string;
  reason: string;
}
