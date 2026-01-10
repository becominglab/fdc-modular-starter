'use client';

/**
 * components/brand/TonmanaCheck.tsx
 *
 * トーン&マナー一貫性チェック
 */

import { useState } from 'react';
import { MessageSquare, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import type { BrandPoint, BrandPointType } from '@/lib/types/brand';

interface TonmanaCheckProps {
  brandName: string;
  points: BrandPoint[];
}

interface CheckResult {
  score: number;
  feedback: string[];
  suggestions: string[];
}

export function TonmanaCheck({ brandName, points }: TonmanaCheckProps) {
  const [inputText, setInputText] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const getPointContent = (type: BrandPointType): string => {
    return points.find(p => p.point_type === type)?.content || '';
  };

  const toneVoice = getPointContent('tone_voice');
  const brandPersonality = getPointContent('brand_personality');
  const keyMessages = getPointContent('key_messages');

  const handleCheck = () => {
    if (!inputText.trim()) return;

    setIsChecking(true);

    // シンプルなルールベースチェック
    setTimeout(() => {
      const feedback: string[] = [];
      const suggestions: string[] = [];
      let score = 70; // ベーススコア

      // 長さチェック
      if (inputText.length < 20) {
        feedback.push('テキストが短すぎます');
        score -= 10;
      }

      // ブランド名含有チェック
      if (inputText.includes(brandName)) {
        feedback.push('ブランド名が含まれています');
        score += 5;
      }

      // トーン&ボイスキーワードチェック
      if (toneVoice) {
        const toneKeywords = toneVoice.split(/[、,，\s]+/).filter(k => k.length > 1);
        const matchedTone = toneKeywords.filter(k => inputText.includes(k));
        if (matchedTone.length > 0) {
          feedback.push(`トーンキーワード「${matchedTone.join('」「')}」が反映されています`);
          score += matchedTone.length * 3;
        } else {
          suggestions.push(`トーン「${toneVoice}」を意識した表現を検討してください`);
        }
      }

      // ブランド人格チェック
      if (brandPersonality) {
        const personalityKeywords = brandPersonality.split(/[、,，\s]+/).filter(k => k.length > 1);
        const matchedPersonality = personalityKeywords.filter(k => inputText.includes(k));
        if (matchedPersonality.length > 0) {
          feedback.push(`ブランド人格「${matchedPersonality.join('」「')}」が表現されています`);
          score += matchedPersonality.length * 3;
        }
      }

      // キーメッセージチェック
      if (keyMessages) {
        const messageKeywords = keyMessages.split(/[、,，\n]+/).filter(k => k.length > 2);
        const matchedMessages = messageKeywords.filter(k => inputText.includes(k));
        if (matchedMessages.length > 0) {
          feedback.push(`キーメッセージが含まれています`);
          score += 10;
        } else {
          suggestions.push('キーメッセージの要素を含めることを検討してください');
        }
      }

      // スコア調整
      score = Math.min(100, Math.max(0, score));

      if (feedback.length === 0) {
        feedback.push('基本的なチェックを通過しました');
      }

      setResult({ score, feedback, suggestions });
      setIsChecking(false);
    }, 500);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning, #f59e0b)';
    return 'var(--error)';
  };

  return (
    <div className="glass-card-light" style={{ padding: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <MessageSquare size={24} color="var(--primary)" />
        <div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--text-dark)',
            margin: 0,
          }}>
            トーン&マナーチェック
          </h2>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            margin: '4px 0 0 0',
          }}>
            テキストがブランドガイドラインに沿っているかチェック
          </p>
        </div>
      </div>

      {/* 必要なポイントの確認 */}
      {(!toneVoice && !brandPersonality) && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--warning, #fef3c7)',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertTriangle size={16} color="var(--warning, #f59e0b)" />
          <p style={{ fontSize: '13px', color: 'var(--text-dark)', margin: 0 }}>
            「トーン&ボイス」と「ブランド人格」を設定すると、より正確なチェックができます
          </p>
        </div>
      )}

      {/* 入力エリア */}
      <div style={{ marginBottom: '16px' }}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="チェックしたいテキストを入力してください（例：SNS投稿、メール文面、広告コピーなど）"
          className="glass-input"
          rows={5}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            resize: 'vertical',
          }}
        />
      </div>

      {/* チェックボタン */}
      <button
        onClick={handleCheck}
        disabled={!inputText.trim() || isChecking}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          padding: '12px',
          fontSize: '14px',
          fontWeight: 600,
          background: inputText.trim() ? 'var(--primary)' : 'var(--bg-gray)',
          color: inputText.trim() ? 'white' : 'var(--text-muted)',
          border: 'none',
          borderRadius: '8px',
          cursor: inputText.trim() ? 'pointer' : 'not-allowed',
        }}
      >
        <Sparkles size={16} />
        {isChecking ? 'チェック中...' : 'チェックする'}
      </button>

      {/* 結果表示 */}
      {result && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: 'var(--bg-gray)',
          borderRadius: '12px',
        }}>
          {/* スコア */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: `4px solid ${getScoreColor(result.score)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}>
              <span style={{
                fontSize: '24px',
                fontWeight: 700,
                color: getScoreColor(result.score),
              }}>
                {result.score}
              </span>
              <span style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
              }}>
                / 100
              </span>
            </div>
          </div>

          {/* フィードバック */}
          {result.feedback.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-dark)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <CheckCircle2 size={14} color="var(--success)" />
                良い点
              </h4>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '13px',
                color: 'var(--text-muted)',
              }}>
                {result.feedback.map((f, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 改善提案 */}
          {result.suggestions.length > 0 && (
            <div>
              <h4 style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-dark)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <Sparkles size={14} color="var(--primary)" />
                改善提案
              </h4>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '13px',
                color: 'var(--text-muted)',
              }}>
                {result.suggestions.map((s, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
