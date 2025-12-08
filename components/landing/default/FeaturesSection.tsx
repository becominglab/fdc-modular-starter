'use client';

/**
 * components/landing/FeaturesSection.tsx
 * ランディングページの機能紹介セクション
 */

import Link from 'next/link';
import styles from './LandingPage.module.css';

export default function FeaturesSection() {
  return (
    <>
      {/* Features Section */}
      <section id="features" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTag}>FDCの主な機能</div>
            <h2 className={styles.sectionTitle}>戦略と現場を、<br className={styles.mobileBreak} />一本の線で繋ぐ</h2>
            <p className={styles.sectionLead}>
              「今日、何に注力すべきか」が明確な組織は強い。戦略から日々のタスクまでが繋がれば、判断に迷う時間がなくなり、全員が本質的な仕事に集中できます。
            </p>
          </div>

          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h3>OKR: 戦略レイヤー</h3>
              <p>会社の羅針盤となるOKR（目標と主要な成果）を直感的に設定・追跡。組織全体の目標を明確にし、全員が同じ方向を向いて進めます。</p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 3v18" />
                  <path d="M15 3v18" />
                </svg>
              </div>
              <h3>Action Map: 戦術レイヤー</h3>
              <p>OKRを具体的なアクションプランに分解。カンバンやツリービューで戦術を可視化し、誰が何をするべきかを明確にします。</p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="m9 11 3 3L22 4" />
                </svg>
              </div>
              <h3>TODO: 実行レイヤー</h3>
              <p>緊急度と重要度でタスクを整理する「4象限マトリクス」を導入。本当に重要なことに集中し、日々の業務を効率化します。</p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3" />
                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                  <path d="m6 18 1.5-1.5-1.5-1.5" />
                  <path d="m10 18-1.5-1.5L10 15" />
                </svg>
              </div>
              <h3>AI アシスタント <span className={styles.comingSoonBadge}>近日実装予定</span></h3>
              <p>Action ItemからTODOリストを自動生成したり、週次レポートのサマリーを作成するなど、AIが雑務を代行。より創造的な仕事に集中できます。<Link href="/ai-terms" className={styles.inlineLink}>AI利用規約</Link></p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.2 8.4c.5.38.8.97.8 1.6v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z" />
                  <path d="m22 22-1.3-1.3" />
                  <path d="M6 8v14" />
                  <path d="M18 8v14" />
                  <path d="m12 12-4 4 4 4 4-4-4-4Z" />
                </svg>
              </div>
              <h3>Google ワークスペース連携</h3>
              <p>GoogleカレンダーやGoogle Tasksと双方向で同期。普段使いのツールを変えることなく、シームレスにFDCを導入できます。</p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                  <path d="M5 21a7 7 0 1 1 14 0c0-3.9-3.1-7-7-7-3.9 0-7 3.1-7 7z" />
                </svg>
              </div>
              <h3>柔軟な権限と可視性</h3>
              <p>レポートラインに基づき「上司は部下の進捗を見れる」など、階層的な可視性を設定可能。セキュアな環境でオープンな情報共有を実現します。</p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className={`${styles.section} ${styles.architectureSection}`}>
        <div className={styles.container}>
          <div className={styles.architectureContent}>
            <div>
              <div className={styles.sectionTag}>INVESTMENT INSIGHT</div>
              <h2 className={styles.sectionTitle}>企業価値を高める<br className={styles.mobileBreak} />組織の共通点</h2>
              <p className={styles.sectionLead}>
                PEファンドで投資先の企業価値向上に携わる中で、一つの法則を発見しました。<br />
                <strong>従業員満足度の高い会社は、例外なく企業価値の成長率も高い。</strong><br />
                そしてその要因を突き詰めると、「戦略と日々の業務が一貫している」という共通点に行き着きます。
              </p>
              <p className={styles.sectionLead}>
                自分の仕事が会社の方向性とどう繋がっているかが明確であれば、迷いがなくなる。迷いがなくなれば、判断が速くなり、ストレスも減る。FDCは「三層構造アーキテクチャ」でこの状態を実現します。
              </p>
              <ul className={styles.listDisc}>
                <li><strong>一貫性の可視化:</strong> すべてのタスクが戦略と紐づいて表示されます。「この仕事は何のため？」という疑問が生まれません。</li>
                <li><strong>双方向の納得感:</strong> 経営層は戦略の浸透度をリアルタイムで把握。現場は自らの貢献を実感でき、内発的動機が高まります。</li>
                <li><strong>報告業務の削減:</strong> 進捗は自動で集約・可視化。形式的な報告会議を減らし、意思決定と実行に時間を使えます。</li>
              </ul>
            </div>
            <div className={styles.architectureDiagram}>
              <div className={`${styles.archLayer} ${styles.archLayerPrimary}`}>
                <div className={styles.archLayerTitle}>1. 戦略層: OKR</div>
                <div className={styles.archLayerDesc}>定性目標 (Objective)</div>
                <div className={styles.archLayerDesc}>定量的な成果指標 (Key Result)</div>
              </div>
              <div className={styles.archArrow}>↓ 連携</div>
              <div className={styles.archLayer}>
                <div className={styles.archLayerTitle}>2. 戦術層: Action Map</div>
                <div className={styles.archLayerDesc}>具体的な計画 (Action Map)</div>
                <div className={styles.archLayerDesc}>実行単位のタスク (Action Item)</div>
              </div>
              <div className={styles.archArrow}>↓ 連携</div>
              <div className={styles.archLayer}>
                <div className={styles.archLayerTitle}>3. 実行層: TODO</div>
                <div className={styles.archLayerDesc}>4象限タスク (Spade, Heart, etc.)</div>
                <div className={styles.archLayerDescSub}>♠ 緊急かつ重要</div>
                <div className={styles.archLayerDescSub}>♥ 重要</div>
                <div className={styles.archLayerDesc}>柔軟な習慣化 (Elastic Habits)</div>
              </div>
              <div className={styles.archFlow}>
                <strong>進捗ロールアップフロー:</strong><br />
                Task完了 → ActionItem進捗更新 → ActionMap進捗更新 → KeyResult進捗更新 → Objective進捗更新
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className={`${styles.section} ${styles.testimonialsSection}`}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTag}>導入企業の声</div>
            <h2 className={styles.sectionTitle}>戦略と現場が繋がることで、<br />組織はどう変わるのか</h2>
          </div>
          <div className={styles.testimonialsGrid}>
            <div className={styles.testimonialCard}>
              <div className={styles.testimonialQuote}>&ldquo;</div>
              <p className={styles.testimonialText}>
                従業員サーベイのスコアが導入後3ヶ月で15%改善しました。要因を分析すると「自分の仕事の意義が明確になった」という項目が最も伸びていた。戦略と現場の接続がエンゲージメントに直結することを実感しています。
              </p>
              <div className={styles.testimonialAuthor}>
                <div className={styles.authorInfo}>
                  <div className={styles.authorName}>S.K.</div>
                  <div className={styles.authorTitle}>CEO, IT企業</div>
                </div>
              </div>
            </div>
            <div className={styles.testimonialCard}>
              <div className={styles.testimonialQuote}>&ldquo;</div>
              <p className={styles.testimonialText}>
                週次の進捗共有会議を廃止できました。全員がダッシュボードを見れば状況がわかるので、会議は意思決定が必要な議題だけに集中。月あたり約10時間の工数削減です。
              </p>
              <div className={styles.testimonialAuthor}>
                <div className={styles.authorInfo}>
                  <div className={styles.authorName}>N.S.</div>
                  <div className={styles.authorTitle}>プロダクトマネージャー, SaaS企業</div>
                </div>
              </div>
            </div>
            <div className={styles.testimonialCard}>
              <div className={styles.testimonialQuote}>&ldquo;</div>
              <p className={styles.testimonialText}>
                「これ、やる意味あるんですか」という質問がチームから消えました。すべてのタスクが戦略に紐づいているので、納得感を持って仕事を進められる。マネジメントコストが大幅に下がりました。
              </p>
              <div className={styles.testimonialAuthor}>
                <div className={styles.authorInfo}>
                  <div className={styles.authorName}>Y.T.</div>
                  <div className={styles.authorTitle}>エンジニアリングリーダー, スタートアップ</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
