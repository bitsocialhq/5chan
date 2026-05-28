import { useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { HashLink } from 'react-router-hash-link';
import { Link } from 'react-router-dom';
import { Footer, HomeLogo } from '../home';
import styles from './pass.module.css';

const overviewQuestionLinks = [
  { id: 'whatpass', key: 'pass_question_what_is' },
  { id: 'available', key: 'pass_question_available' },
  { id: 'whatdoes', key: 'pass_question_what_does' },
  { id: 'governance', key: 'pass_question_governance' },
  { id: 'whatnot', key: 'pass_question_what_not' },
  { id: 'vip', key: 'pass_question_vip' },
  { id: 'challenge', key: 'pass_question_challenge' },
  { id: 'payment', key: 'pass_question_payment' },
  { id: 'pricing', key: 'pass_question_pricing' },
  { id: 'nft', key: 'pass_question_nft' },
  { id: 'proceeds', key: 'pass_question_proceeds' },
] as const;

const faqQuestionLinks = [
  { id: 'needpass', key: 'pass_question_need' },
  { id: 'fiat', key: 'pass_question_fiat' },
  { id: 'vpn', key: 'pass_question_vpn' },
  { id: 'bypass', key: 'pass_question_bypass' },
  { id: 'privileges', key: 'pass_question_privileges' },
] as const;

const Pass = () => {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    document.title = t('pass_document_title');
  }, [t]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <HomeLogo />
        <div className={`${styles.box} ${styles.infoBox}`}>
          <div className={styles.boxBar}>
            <h2>{t('pass_heading')}</h2>
          </div>
          <div className={styles.boxContent}>
            <Trans
              i18nKey='pass_intro_body'
              components={{
                strong: <strong />,
                vip: <Link to='/vip' />,
              }}
            />
          </div>
        </div>
        <div className={styles.columns}>
          <div className={`${styles.box} ${styles.leftBox}`}>
            <div className={styles.boxBar}>
              <h2>{t('pass_questions')}</h2>
            </div>
            <div className={styles.boxContent}>
              <ul className={styles.list}>
                <li>
                  <strong>
                    <HashLink to='#overview'>{t('pass_overview')}</HashLink>
                  </strong>
                  <ul>
                    {overviewQuestionLinks.map(({ id, key }) => (
                      <li key={id}>
                        <HashLink to={`#${id}`}>{t(key)}</HashLink>
                      </li>
                    ))}
                  </ul>
                </li>
                <li>
                  <strong>
                    <HashLink to='#faq'>{t('pass_faq')}</HashLink>
                  </strong>
                  <ul>
                    {faqQuestionLinks.map(({ id, key }) => (
                      <li key={id}>
                        <HashLink to={`#${id}`}>{t(key)}</HashLink>
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </div>
          </div>
          <div className={`${styles.box} ${styles.rightBox}`}>
            <div className={styles.boxBar}>
              <h2 id='overview'>{t('pass_overview')}</h2>
            </div>
            <div className={styles.boxContent}>
              <dl>
                <dt className={styles.first} id='whatpass'>
                  {t('pass_question_what_is')}
                </dt>
                <dd>
                  <Trans
                    i18nKey='pass_answer_what_is'
                    components={{
                      vip: <Link to='/vip' />,
                    }}
                  />
                </dd>
                <dt id='available'>{t('pass_question_available')}</dt>
                <dd>{t('pass_answer_available')}</dd>
                <dt id='whatdoes'>{t('pass_question_what_does')}</dt>
                <dd>
                  <Trans
                    i18nKey='pass_answer_what_does'
                    components={{
                      vip: <Link to='/vip' />,
                    }}
                  />
                </dd>
                <dt id='governance'>{t('pass_question_governance')}</dt>
                <dd>{t('pass_answer_governance')}</dd>
                <dt id='whatnot'>{t('pass_question_what_not')}</dt>
                <dd>
                  <Trans
                    i18nKey='pass_answer_what_not'
                    components={{
                      rules: <Link to='/rules' />,
                    }}
                  />
                </dd>
                <dt id='vip'>{t('pass_question_vip')}</dt>
                <dd>
                  <Trans
                    i18nKey='pass_answer_vip'
                    components={{
                      vip: <Link to='/vip' />,
                    }}
                  />
                </dd>
                <dt id='challenge'>{t('pass_question_challenge')}</dt>
                <dd>{t('pass_answer_challenge')}</dd>
                <dt id='payment'>{t('pass_question_payment')}</dt>
                <dd>{t('pass_answer_payment')}</dd>
                <dt id='pricing'>{t('pass_question_pricing')}</dt>
                <dd>{t('pass_answer_pricing')}</dd>
                <dt id='nft'>{t('pass_question_nft')}</dt>
                <dd>
                  <Trans
                    i18nKey='pass_answer_nft'
                    components={{
                      mintPass: <a href='https://github.com/bitsocialnet/mintpass' target='_blank' rel='noopener noreferrer' aria-label='Mintpass' />,
                    }}
                  />
                </dd>
                <dt id='proceeds'>{t('pass_question_proceeds')}</dt>
                <dd>
                  <Trans
                    i18nKey='pass_answer_proceeds'
                    components={{
                      bitsocial: <a href='https://bitsocial.net' target='_blank' rel='noopener noreferrer' aria-label='Bitsocial' />,
                    }}
                  />
                </dd>
                <dt id='faq'>{t('pass_question_need')}</dt>
                <dd id='needpass'>
                  <Trans
                    i18nKey='pass_answer_need'
                    components={{
                      vip: <Link to='/vip' />,
                    }}
                  />
                </dd>
                <dt id='fiat'>{t('pass_question_fiat')}</dt>
                <dd>{t('pass_answer_fiat')}</dd>
                <dt id='vpn'>{t('pass_question_vpn')}</dt>
                <dd>{t('pass_answer_vpn')}</dd>
                <dt id='bypass'>{t('pass_question_bypass')}</dt>
                <dd>{t('pass_answer_bypass')}</dd>
                <dt id='privileges'>{t('pass_question_privileges')}</dt>
                <dd>{t('pass_answer_privileges')}</dd>
              </dl>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default Pass;
