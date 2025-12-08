'use client';

/**
 * components/landing/shared/LandingFooter.tsx
 * ランディングページのフッター
 * 共通コンポーネント：全テナントで使用
 */

import Link from 'next/link';
import styles from '../default/LandingPage.module.css';

export default function LandingFooter() {
  return (
    <footer className={styles.mainFooter}>
      <div className={styles.container}>
        <div className={styles.footerNav}>
          <a href="#features">機能</a>
          <a href="#architecture">思想</a>
          <a href="#testimonials">お客様の声</a>
          <a href="#pricing">料金プラン</a>
          <a href="#security">セキュリティ</a>
          <a href="#faq">FAQ</a>
          <Link href="/privacy">プライバシーポリシー</Link>
          <Link href="/terms">利用規約</Link>
          <Link href="/ai-terms">AI利用規約</Link>
          <Link href="/legal">特定商取引法</Link>
        </div>
        <p className={styles.copyright}>&copy; 2025 Founders Direct. All rights reserved.</p>
        <p className={styles.secretLink}>
          <a href="https://www.foundersdirect.jp/lp.html">自分で創りたい創業者はこちら</a>
        </p>
      </div>
    </footer>
  );
}
