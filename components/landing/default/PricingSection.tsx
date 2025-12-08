'use client';

/**
 * components/landing/PricingSection.tsx
 * ランディングページの料金プランセクション
 */

import styles from './LandingPage.module.css';

export default function PricingSection() {
  return (
    <section id="pricing" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTag}>料金プラン</div>
          <h2 className={styles.sectionTitle}>あなたのチームに<br className={styles.mobileBreak} />最適なプランを</h2>
          <p className={styles.sectionLead}>
            全プラン14日間無料でお試しいただけます。<br className={styles.pcBreak} />
            チームの成長に合わせて、いつでもアップグレード可能。
          </p>
        </div>

        <div className={styles.pricingGrid}>
          {/* Starter Plan */}
          <div className={styles.pricingCard}>
            <div className={styles.pricingHeader}>
              <h3>Starter</h3>
              <p className={styles.pricingDesc}>個人や小規模チームで、まず始めてみたい方に。</p>
              <p className={styles.price}>¥30,000<span className={styles.priceUnit}> / 月</span></p>
            </div>
            <ul className={styles.featuresList}>
              <li>5ユーザーまで</li>
              <li>OKR・Action Map・TODO</li>
              <li>4象限タスク管理</li>
              <li>コミュニティサポート</li>
            </ul>
            <a href="#cta" className={`${styles.btn} ${styles.btnSecondary} ${styles.pricingBtn}`}>14日間無料で試す</a>
          </div>

          {/* Team Plan */}
          <div className={`${styles.pricingCard} ${styles.popular}`}>
            <div className={styles.popularBadge}>一番人気</div>
            <div className={styles.pricingHeader}>
              <h3>Team</h3>
              <p className={styles.pricingDesc}>本格的に目標達成を目指す、成長中のチームに。</p>
              <p className={styles.price}>¥50,000<span className={styles.priceUnit}> / 月</span></p>
            </div>
            <ul className={styles.featuresList}>
              <li><strong>Starterの全機能</strong></li>
              <li>10ユーザーまで</li>
              <li>Googleカレンダー/Tasks連携</li>
              <li>AIアシスタント機能（近日実装予定）</li>
              <li>権限・可視性設定</li>
              <li>メールサポート</li>
            </ul>
            <a href="#cta" className={`${styles.btn} ${styles.btnPrimary} ${styles.pricingBtn}`}>14日間無料で試す</a>
          </div>

          {/* Your SaaS Plan */}
          <div className={styles.pricingCard}>
            <div className={styles.pricingHeader}>
              <h3>Your SaaS</h3>
              <p className={styles.pricingDesc}>自社ブランドのSaaSとして提供したい方に。</p>
              <p className={styles.price}>¥100,000<span className={styles.priceUnit}> / 月〜</span></p>
            </div>
            <ul className={styles.featuresList}>
              <li><strong>Teamの全機能</strong></li>
              <li>自社ロゴ・独自カラー設定</li>
              <li>専用環境（独自ドメイン対応）</li>
              <li>10名まで基本料金内</li>
              <li>11名以上は従量課金（応相談）</li>
              <li>前払い割引あり（4ヶ月分で6ヶ月）</li>
            </ul>
            <a href="#cta" className={`${styles.btn} ${styles.btnSecondary} ${styles.pricingBtn}`}>お問い合わせ</a>
          </div>
        </div>

        {/* Security Section */}
        <section id="security" className={`${styles.section} ${styles.securitySection}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTag}>SECURITY</div>
              <h2 className={styles.sectionTitle}>エンタープライズグレードの<br className={styles.mobileBreak} />セキュリティ</h2>
              <p className={styles.sectionLead}>
                IPA（情報処理推進機構）の「非機能要求グレード2018」に完全準拠。<br />
                大企業が求める品質基準を満たした設計で、安心してご利用いただけます。
              </p>
            </div>

            <div className={styles.securityGrid}>
              <div className={styles.securityCard}>
                <div className={styles.securityIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h3>データ暗号化</h3>
                <p>保存データはAES-256-GCMで暗号化。通信はHTTPS（TLS 1.3）で保護され、中間者攻撃を完全に防止します。</p>
                <div className={styles.securityBadge}>AES-256-GCM</div>
              </div>

              <div className={styles.securityCard}>
                <div className={styles.securityIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3>認証・認可</h3>
                <p>Google OAuth 2.0（PKCE）による安全な認証。役割ベースアクセス制御（RBAC）で、ユーザーごとに細かな権限設定が可能です。</p>
                <div className={styles.securityBadge}>OAuth 2.0 PKCE</div>
              </div>

              <div className={styles.securityCard}>
                <div className={styles.securityIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <h3>脆弱性対策</h3>
                <p>XSS、CSRF、SQLインジェクションなどOWASP Top 10の全項目に対応。Zodによる厳密な入力検証で不正データを遮断します。</p>
                <div className={styles.securityBadge}>OWASP準拠</div>
              </div>

              <div className={styles.securityCard}>
                <div className={styles.securityIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                    <path d="M10 9H8" />
                  </svg>
                </div>
                <h3>監査ログ</h3>
                <p>全ての操作を詳細に記録し、2年間保持。いつ、誰が、何をしたかを完全にトレース可能です。</p>
                <div className={styles.securityBadge}>2年間保持</div>
              </div>

              <div className={styles.securityCard}>
                <div className={styles.securityIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h3>SLA保証</h3>
                <p>稼働率99.5%を保証。RTO（復旧目標時間）1時間、RPO（復旧目標点）24時間の明確なコミットメントを提供します。</p>
                <div className={styles.securityBadge}>99.5% SLA</div>
              </div>

              <div className={styles.securityCard}>
                <div className={styles.securityIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
                    <path d="M3 12A9 3 0 0 0 21 12" />
                  </svg>
                </div>
                <h3>バックアップ・DR</h3>
                <p>日次自動バックアップ、30日間保持。災害発生時も迅速にリージョン切替が可能な災害対策設計です。</p>
                <div className={styles.securityBadge}>日次バックアップ</div>
              </div>
            </div>

            <div className={styles.complianceSection}>
              <h3 className={styles.complianceTitle}>IPA 非機能要求グレード 2018 対応状況</h3>
              <div className={styles.complianceGrid}>
                <div className={styles.complianceItem}>
                  <span className={styles.complianceCheck}>✓</span>
                  <span>可用性 100%</span>
                </div>
                <div className={styles.complianceItem}>
                  <span className={styles.complianceCheck}>✓</span>
                  <span>性能・拡張性 100%</span>
                </div>
                <div className={styles.complianceItem}>
                  <span className={styles.complianceCheck}>✓</span>
                  <span>運用・保守性 100%</span>
                </div>
                <div className={styles.complianceItem}>
                  <span className={styles.complianceCheck}>✓</span>
                  <span>移行性 100%</span>
                </div>
                <div className={styles.complianceItem}>
                  <span className={styles.complianceCheck}>✓</span>
                  <span>セキュリティ 100%</span>
                </div>
                <div className={styles.complianceItem}>
                  <span className={styles.complianceCheck}>✓</span>
                  <span>システム環境 100%</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
