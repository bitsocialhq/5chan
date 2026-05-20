import { type ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HashLink } from 'react-router-hash-link';
import { Footer, HomeLogo } from '../home';
import styles from './faq.module.css';

const externalLinkProps = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const;

type FAQItem = {
  id: string;
  question: string;
  answer: ReactNode;
};

type FAQSection = {
  id: string;
  title: string;
  items: FAQItem[];
};

const FAQ_SECTIONS: FAQSection[] = [
  {
    id: 'basics',
    title: 'Basics',
    items: [
      {
        id: 'what5chan',
        question: 'What is 5chan?',
        answer: (
          <>
            5chan is a serverless, adminless, decentralized imageboard built on the{' '}
            <a href='https://bitsocial.net' {...externalLinkProps}>
              Bitsocial
            </a>{' '}
            protocol. It keeps the familiar board, thread, and anonymous posting flow of imageboards, but boards are Bitsocial communities owned by their operators
            instead of by one global website administrator.
          </>
        ),
      },
      {
        id: 'justwebsite',
        question: 'Is 5chan just this website?',
        answer: (
          <>
            No. This website is one client for the Bitsocial network. The domain can move, disappear, be mirrored, or be replaced by an installed copy without changing
            the underlying boards. You can also{' '}
            <a href='https://github.com/bitsocialnet/5chan/releases/latest' {...externalLinkProps}>
              download 5chan
            </a>{' '}
            for Android, Windows, macOS, or Linux.
          </>
        ),
      },
      {
        id: 'howaccess',
        question: 'How do I access the boards?',
        answer: (
          <>
            Use the homepage directories, the top boards bar, <Link to='/all'>/all/</Link>, <Link to='/subs'>/subs/</Link>, a direct board link, or the search box. If you
            know a board address such as <code>music-posting.bso</code> or a public key, paste it into search and press Enter.
          </>
        ),
      },
      {
        id: 'directories',
        question: 'What are directories?',
        answer: (
          <>
            Directories are short paths such as <code>/g/</code>, <code>/biz/</code>, or <code>/mu/</code> that point to featured boards. Today they are handpicked
            through pull requests to the{' '}
            <a href='https://github.com/bitsocialnet/lists/tree/master/5chan-directories' {...externalLinkProps}>
              5chan directory files
            </a>{' '}
            until directory voting is available. A board does not need a directory slot to exist or be reachable.
          </>
        ),
      },
      {
        id: 'whatbasics',
        question: 'What should I know before I post?',
        answer: (
          <>
            Read the rules for the board you are using. 5chan has no global rules page that overrides every board. Each board owner and moderator team decides what
            belongs in that board, while each app or mirror can decide what it indexes or displays.
          </>
        ),
      },
    ],
  },
  {
    id: 'posting',
    title: 'Posting',
    items: [
      {
        id: 'howpost',
        question: 'How do I post on 5chan?',
        answer: (
          <>
            Open a board, fill out the post form, optionally add a name, subject, comment, and link, then submit. Some boards require a media link for new threads. Some
            boards also require an anti-spam challenge before the post is accepted.
          </>
        ),
      },
      {
        id: 'postanon',
        question: 'How do I post anonymously?',
        answer: (
          <>
            Leave the <code>[Name]</code> field blank. The post will display as Anonymous. 5chan still signs posts with your local account key, so anonymity means "not
            using a display name", not "no cryptographic identity exists".
          </>
        ),
      },
      {
        id: 'register',
        question: 'Can I register a username?',
        answer: (
          <>
            There is no central username registry. 5chan creates a local account for you, and you can edit your display name in the post form or settings. For a stronger
            identity, you can use a readable crypto address such as <code>myname.bso</code> after configuring the matching Bitsocial record. Display names by themselves
            are not proof of identity.
          </>
        ),
      },
      {
        id: 'tripcodes',
        question: 'Does 5chan use tripcodes?',
        answer: (
          <>
            Not currently. 5chan uses key-controlled accounts and optional readable crypto addresses instead of 4chan-style tripcodes. If you need a persistent identity,
            back up your account and use a resolvable address instead of relying on a display name.
          </>
        ),
      },
      {
        id: 'howimage',
        question: 'How do I post an image or video?',
        answer: (
          <>
            Paste a direct media URL into the <code>[Link]</code> field. 5chan detects images, GIFs, video, audio, and supported embeds. Direct links work best. If the
            link is detected as a webpage instead of media, try a direct file URL or a different host.
          </>
        ),
      },
      {
        id: 'uploadimage',
        question: 'Can I upload media directly?',
        answer: (
          <>
            Yes in the Android and desktop apps, where 5chan can hand the file to a media hosting service. Browser uploads are limited by CORS and should use an external
            host first. The board post itself stores text and links; the external media host may still see your IP address when you upload or when other users load the
            file.
          </>
        ),
      },
      {
        id: 'postimage',
        question: 'Must I post an image?',
        answer: (
          <>
            It depends on the board. Directory boards can require new threads to include a media link. 5chan also filters text-only threads out of some catalog views to
            preserve the imageboard feel, and you can adjust catalog filters when browsing.
          </>
        ),
      },
      {
        id: 'replyimage',
        question: 'Can I reply with an image?',
        answer: (
          <>
            Yes, unless that board disables or restricts media replies. Open the reply box and add a direct media URL in the <code>[Link]</code> field before submitting.
          </>
        ),
      },
      {
        id: 'quote',
        question: 'How do I quote somebody?',
        answer: (
          <>
            Put <code>{'>'}text</code> at the start of a line for greentext. Use <code>{'>>'}123</code> to reference a post number in the current thread. Clicking a post
            number opens the reply box with the quote inserted, and selecting text before replying can insert the selected text.
          </>
        ),
      },
      {
        id: 'crossquote',
        question: 'Can I quote posts from other boards?',
        answer: (
          <>
            Yes. Cross-board quotes use the familiar <code>{'>>>/board/post'}</code> shape, such as <code>{'>>>/g/123'}</code>. 5chan resolves directory codes and board
            addresses when it can find the target.
          </>
        ),
      },
      {
        id: 'multireply',
        question: 'Can I reply to multiple posts?',
        answer: (
          <>
            Yes. Add multiple <code>{'>>'}number</code> references in one reply, one per line or wherever they make sense in your message.
          </>
        ),
      },
      {
        id: 'spoiler',
        question: 'Can I mark a submission as a spoiler?',
        answer: (
          <>
            Usually. Use the spoiler checkbox for media when the board allows it. For text, wrap the hidden part in <code>[spoiler]hidden text[/spoiler]</code>. Some
            boards disable spoilers for posts or replies.
          </>
        ),
      },
      {
        id: 'deletepost',
        question: 'How do I delete or edit my own post?',
        answer: (
          <>
            Use the post menu or edit controls when they are available. Author deletion and editing depend on your local account, the board's pseudonymity mode, and
            whether the app can prove that your account authored the post. Deleting publishes an edit to the board; it is not a global erase button for every copy that
            may already exist elsewhere.
          </>
        ),
      },
      {
        id: 'report',
        question: 'How do I report posts?',
        answer: (
          <>
            Reporting is not available yet. For now, board moderation happens through board-specific moderator tools and rules. If you are a board moderator, use the mod
            queue and edit controls available for that board.
          </>
        ),
      },
      {
        id: 'prunedelete',
        question: 'My post disappeared. Where did it go?',
        answer: (
          <>
            It may have been deleted by its author, removed or purged by board moderation, rejected by an anti-spam challenge, hidden locally by your filters, archived by
            board lifecycle rules, or unavailable because the board node or gateway is temporarily offline.
          </>
        ),
      },
      {
        id: 'bump',
        question: "Why won't my thread bump?",
        answer: (
          <>
            Boards can have thread limits, bump limits, locks, and archive rules. For example, directory metadata can define a bump limit. Once a thread reaches the
            board's limit or is locked or archived, new replies may no longer move it up.
          </>
        ),
      },
      {
        id: 'archive',
        question: 'Can I retrieve an old post or image?',
        answer: (
          <>
            Not always. Bitsocial is optimized for current social content, not permanent archival storage. Old content may still exist on the board operator's node, on
            peers that cached it, in an archive view, or on the original media host, but 5chan cannot promise that every old post or image will remain available forever.
          </>
        ),
      },
    ],
  },
  {
    id: 'boards-moderation',
    title: 'Boards And Moderation',
    items: [
      {
        id: 'whooperate',
        question: 'Who operates 5chan?',
        answer: (
          <>
            The 5chan app is open-source software. The operator of a public domain is hosting a static client, not owning every board or every post. Boards are operated
            by their own Bitsocial community owners.
          </>
        ),
      },
      {
        id: 'whoadmin',
        question: 'Who is the administrator?',
        answer: (
          <>
            There is no global 5chan administrator with authority over every board. Each board has its own owner and can have its own moderators. App maintainers can
            change the client, defaults, and directory listings, but they do not become the owner of every Bitsocial community.
          </>
        ),
      },
      {
        id: 'whomod',
        question: 'Who are the moderators?',
        answer: (
          <>
            Moderators are assigned per board by the board owner or by the board's management setup. They can remove, purge, lock, pin, archive, ban, or review posts
            according to that board's policy and tools.
          </>
        ),
      },
      {
        id: 'capcode',
        question: 'What are owner and moderator labels?',
        answer: (
          <>
            Some posts show role labels or icons for board owners and moderators. Those labels are board-scoped. They are not global staff badges and do not imply
            authority on unrelated boards.
          </>
        ),
      },
      {
        id: 'createboard',
        question: 'Can I create my own board?',
        answer: (
          <>
            Yes. A 5chan board is a Bitsocial community. Today the practical route is to use{' '}
            <a href='https://github.com/bitsocialnet/5chan-board-manager' {...externalLinkProps}>
              5chan Board Manager
            </a>{' '}
            to run the board with imageboard lifecycle rules such as thread limits, bump limits, archived-thread retention, and purging of author-deleted content. Its
            Docker setup can start the required Bitsocial node for you or connect to one you already operate.
          </>
        ),
      },
      {
        id: 'submitdirectory',
        question: 'How do I get my board into a directory?',
        answer: (
          <>
            Open a pull request against the relevant file in the{' '}
            <a href='https://github.com/bitsocialnet/lists/tree/master/5chan-directories' {...externalLinkProps}>
              5chan-directories folder
            </a>{' '}
            with the board title, address, and NSFW status. Current expectations include high uptime, active use, relevant topic fit, and responsible moderation. Future
            directory voting is planned for 5chan Pass holders.
          </>
        ),
      },
      {
        id: 'banishment',
        question: 'Can I be banned?',
        answer: (
          <>
            A board can ban or restrict you inside that board. An app or mirror can also choose what it shows. There is no protocol-level super-admin who can erase your
            identity or confiscate every community from the network.
          </>
        ),
      },
      {
        id: 'banappeal',
        question: 'Can I appeal a ban?',
        answer: <>There is no global appeal form. Appeals, if any, are handled by the board owner or moderators for the board that banned you.</>,
      },
      {
        id: 'worksafe',
        question: 'What does work safe mean?',
        answer: (
          <>
            Directory entries can mark boards as safe-for-work or NSFW. Homepage and catalog filters can use that metadata, but users should still read the board title,
            topic, and rules before opening or posting.
          </>
        ),
      },
    ],
  },
  {
    id: 'features',
    title: 'Features',
    items: [
      {
        id: 'catalog',
        question: 'What is the catalog?',
        answer: (
          <>
            The catalog is a thumbnail-first board view. Use <code>/board/catalog</code> for one board, <Link to='/all/catalog'>/all/catalog</Link> for directory boards,
            or <Link to='/subs/catalog'>/subs/catalog</Link> for boards you subscribe to.
          </>
        ),
      },
      {
        id: 'filters',
        question: 'How do filters work?',
        answer: (
          <>
            Catalog filters can hide or prioritize matching threads by text, display name, user ID, board, or other local criteria. These are local browsing filters. They
            do not remove posts from the board.
          </>
        ),
      },
      {
        id: 'subscriptions',
        question: 'How do subscriptions work?',
        answer: (
          <>
            Subscribe to a board to keep it in your top bar and in <Link to='/subs'>/subs/</Link>. Subscriptions are stored in your local account data, so back up your
            account if you want to move them to another device.
          </>
        ),
      },
      {
        id: 'directlinks',
        question: 'Can I share direct links?',
        answer: (
          <>
            Yes. Post menus can copy a direct thread link, content ID, or user ID. Links usually use the current directory code when one exists, and fall back to the
            board address when needed.
          </>
        ),
      },
      {
        id: 'imagesource',
        question: 'How can I find the source of an image?',
        answer: <>On media posts, the post menu includes image search links such as Google Lens, Yandex, and SauceNAO when 5chan can identify a usable image URL.</>,
      },
      {
        id: 'downloads',
        question: 'Where can I get the apps?',
        answer: (
          <>
            Use the{' '}
            <a href='https://github.com/bitsocialnet/5chan/releases/latest' {...externalLinkProps}>
              latest GitHub release
            </a>{' '}
            for Android, Windows, macOS, and Linux builds. The web app remains available from public mirrors.
          </>
        ),
      },
      {
        id: 'mirrors',
        question: 'What mirrors exist?',
        answer: (
          <>
            Public mirrors can change over time. The Bitsocial app directory currently lists 5chan web access and mirrors such as <code>5chan.app</code>,{' '}
            <code>5chan.eth.limo</code>, <code>5chan.cc</code>, and <code>5channel.org</code>. If one mirror is unreachable, try another or use an installed app.
          </>
        ),
      },
      {
        id: 'extension',
        question: 'Does 5chan have an official browser extension?',
        answer: (
          <>
            No official 5chan browser extension is required. For IPFS and ENS-style static mirrors, tools such as IPFS Companion can help advanced users, but the ordinary
            web app does not require an extension.
          </>
        ),
      },
      {
        id: 'pass',
        question: 'What is 5chan Pass?',
        answer: (
          <>
            <Link to='/pass'>5chan Pass</Link> is a planned supporter pass. It is not available to buy, activate, or renew yet. The current plan is for pass holders to
            participate in directory voting, post on <code>/vip/</code>, and skip compatible posting challenges on boards that support the pass challenge. Final directory
            governance mechanics are still being designed and are expected to include BSO-holder alignment rather than pass-only final control.
          </>
        ),
      },
    ],
  },
  {
    id: 'issues',
    title: 'Issues',
    items: [
      {
        id: 'challenge',
        question: 'What is an anti-spam challenge?',
        answer: (
          <>
            A challenge is a board's posting check. It can be a captcha, rate limit, payment, token gate, allowlist, iframe flow, or custom code. 5chan shows the
            challenge before publishing when the board requires one.
          </>
        ),
      },
      {
        id: 'whychallenge',
        question: 'Why does 5chan use challenges?',
        answer: (
          <>
            Open peer-to-peer pubsub can be flooded by spam. Bitsocial keeps spam resistance local by letting each board choose its own challenge instead of forcing every
            board into one global CAPTCHA or account policy.
          </>
        ),
      },
      {
        id: 'whyspam',
        question: 'Why do I still see spam?',
        answer: (
          <>
            No anti-spam system is perfect, and each board chooses its own policy. Some boards may prefer open posting with lighter moderation. Others may use stricter
            challenges, moderator queues, bans, or allowlists.
          </>
        ),
      },
      {
        id: 'xbroken',
        question: 'Why does something not load?',
        answer: (
          <>
            The board node may be offline, the browser gateway may be slow, a media host may block embeds, your local cache may be stale, or a public router may not have
            enough peers yet. Try refreshing, waiting a moment, using another mirror, or opening the board in an installed app.
          </>
        ),
      },
      {
        id: 'downtime',
        question: 'Where should I go if 5chan is unreachable?',
        answer: (
          <>
            Try another mirror, an installed app, or the latest release build. For app-level outages and development discussion, check the{' '}
            <a href='https://github.com/bitsocialnet/5chan' {...externalLinkProps}>
              GitHub repo
            </a>{' '}
            or the{' '}
            <a href='https://t.me/fivechandev' {...externalLinkProps}>
              Telegram dev group
            </a>
            .
          </>
        ),
      },
      {
        id: 'torproxy',
        question: 'What is the Tor, VPN, and proxy policy?',
        answer: (
          <>
            5chan has no global IP policy, but individual boards, gateways, media hosts, or challenge providers may apply their own rules. Peer-to-peer networking can
            expose network metadata, so do not assume a VPN or Tor makes all activity anonymous.
          </>
        ),
      },
      {
        id: 'copyrighted',
        question: 'Will 5chan remove copyrighted material?',
        answer: (
          <>
            5chan usually embeds links to external media rather than hosting browser-uploaded media itself. Copyright complaints about hosted media should go to the media
            host. Board-specific content issues belong with that board's owner or moderators. App repository issues should be limited to the 5chan software itself.
          </>
        ),
      },
    ],
  },
  {
    id: 'technical',
    title: 'Technical',
    items: [
      {
        id: 'software',
        question: 'What software does 5chan use?',
        answer: (
          <>
            The 5chan client is free and open-source software under GPL-3.0-or-later. Boards are Bitsocial communities, typically run with{' '}
            <a href='https://github.com/bitsocialnet/5chan-board-manager' {...externalLinkProps}>
              5chan Board Manager
            </a>
            , which connects to the Bitsocial network and applies 5chan-specific board behavior.
          </>
        ),
      },
      {
        id: 'hardware',
        question: 'What hardware does a board need?',
        answer: (
          <>
            A board operator runs a Bitsocial node. Bitsocial is designed so community nodes can run on ordinary hardware such as a laptop, Raspberry Pi, or cheap VPS, as
            long as the operator can keep the board online.
          </>
        ),
      },
      {
        id: 'howp2p',
        question: 'How does the peer-to-peer network work?',
        answer: (
          <>
            Communities are addressed by public keys or readable names that resolve to public keys. Clients ask routers for peers that provide the community, fetch the
            latest metadata and content pointers, then fetch the post content from peers. Publishing uses peer-to-peer pubsub plus the board's challenge system.
          </>
        ),
      },
      {
        id: 'gateway',
        question: 'Can browsers connect peer-to-peer?',
        answer: (
          <>
            Yes. The web app can run a{' '}
            <a href='https://helia.io' {...externalLinkProps}>
              Helia
            </a>{' '}
            IPFS node in the browser, so it can load boards peer-to-peer without centralized IPFS RPC gateways. You can turn pure browser P2P on in advanced settings and
            inspect the connection in <Link to='/all/settings#p2p-stats-settings'>P2P stats</Link>. Browser nodes still have restrictions, such as limited inbound
            connectivity, so desktop apps remain the best way to host board data because they run a full Bitsocial node with IPFS Kubo.
          </>
        ),
      },
      {
        id: 'blockchain',
        question: 'Is 5chan on a blockchain?',
        answer: (
          <>
            No. Bitsocial avoids putting posts on-chain. Social media does not need global transaction ordering, and skipping a blockchain avoids gas fees, block-time
            delays, and permanent storage bloat.
          </>
        ),
      },
      {
        id: 'federation',
        question: 'Is 5chan federated like Mastodon?',
        answer: (
          <>
            No. Federation still depends on servers, admins, domains, and instance policies. Bitsocial communities are peer-to-peer communities addressed by keys, so
            hosting can change without turning one server into the owner of every account and post.
          </>
        ),
      },
      {
        id: 'bso',
        question: 'What are .bso addresses?',
        answer: (
          <>
            <code>.bso</code> names are readable Bitsocial names that resolve to public keys through Bitsocial TXT records. 5chan also recognizes some legacy or
            compatible crypto-domain aliases, but the current Bitsocial-first naming is <code>.bso</code>.
          </>
        ),
      },
      {
        id: 'personalinfo',
        question: 'What personal information is collected?',
        answer: (
          <>
            5chan does not require a central account signup. Your app stores account data, settings, subscriptions, and caches locally. Network peers, gateways, challenge
            providers, and external media hosts may still see normal network metadata. Public crypto addresses, on-chain pass activity, and linked media URLs should be
            treated as public.
          </>
        ),
      },
      {
        id: 'privacy',
        question: 'Is 5chan fully anonymous?',
        answer: (
          <>
            No. 5chan can avoid a central website administrator seeing every poster IP, but peer-to-peer systems still expose network-level information. Bitsocial
            encrypts publication content before it enters pubsub during publishing, but accepted board content is public. You should not treat 5chan as a complete
            anonymity tool.
          </>
        ),
      },
      {
        id: 'oldcontent',
        question: 'Does Bitsocial store everything forever?',
        answer: (
          <>
            No. Bitsocial keeps the latest community state and content pointers lightweight. Old posts may remain available through the board operator, peers, caches, or
            archives, but permanent availability is not guaranteed by the protocol.
          </>
        ),
      },
    ],
  },
  {
    id: 'culture-contribution',
    title: 'Culture And Contribution',
    items: [
      {
        id: 'anonymous',
        question: 'Who is Anonymous?',
        answer: (
          <>
            Anonymous is the default display name when no name is provided. It is a posting style, not one shared person. Depending on the board's pseudonymity mode,
            5chan may still show per-post or per-reply user IDs to help readers follow a thread without revealing a chosen name.
          </>
        ),
      },
      {
        id: 'contribwhat',
        question: 'What is considered positive contribution?',
        answer: (
          <>
            Post on-topic material, source useful links, respect each board's rules, avoid spam, and help new boards build a real culture. Since boards are independent,
            what counts as a good contribution depends on the board.
          </>
        ),
      },
      {
        id: 'shitposting',
        question: 'What is low-quality posting?',
        answer: (
          <>
            Repeated spam, off-topic flooding, malicious links, impersonation, and challenge abuse make boards worse and may get you filtered, removed, or banned by that
            board.
          </>
        ),
      },
      {
        id: 'contribhow',
        question: 'How can I contribute to the project?',
        answer: (
          <>
            Use the software, run boards, report app bugs, open pull requests, improve documentation, build compatible clients, or help with Bitsocial infrastructure. The
            app source is on{' '}
            <a href='https://github.com/bitsocialnet/5chan' {...externalLinkProps}>
              GitHub
            </a>
            .
          </>
        ),
      },
      {
        id: 'donations',
        question: 'How can I support 5chan financially?',
        answer: (
          <>
            5chan Pass is the planned supporter path, but it is not live yet. Until then, the most useful support is running boards, improving the client, testing
            releases, and helping the Bitsocial ecosystem mature.
          </>
        ),
      },
      {
        id: 'events',
        question: 'Does 5chan hold official events?',
        answer: (
          <>
            There is no formal global event program. If you want to host a meetup, panel, or board-specific event, make it clear that it is community-run unless the core
            project explicitly says otherwise.
          </>
        ),
      },
      {
        id: 'about',
        question: 'Where can I learn more?',
        answer: (
          <>
            Read the{' '}
            <a href='https://bitsocial.net/docs/' {...externalLinkProps}>
              Bitsocial docs
            </a>
            , the{' '}
            <a href='https://github.com/bitsocialnet/5chan' {...externalLinkProps}>
              5chan source repository
            </a>
            , and the app directory on{' '}
            <a href='https://bitsocial.net/apps' {...externalLinkProps}>
              bitsocial.net
            </a>
            .
          </>
        ),
      },
    ],
  },
];

const FAQ = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'FAQ - 5chan';
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <HomeLogo />
        <div className={`${styles.box} ${styles.infoBox}`}>
          <div className={styles.boxBar}>
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className={styles.boxContent}>
            Welcome to 5chan's <strong>F</strong>requently <strong>A</strong>sked <strong>Q</strong>uestions page. After reading the FAQ, be sure to familiarize yourself
            with the <Link to='/rules'>Rules</Link>!
          </div>
        </div>
        <div className={styles.columns}>
          <div className={`${styles.box} ${styles.leftBox}`}>
            <div className={styles.boxBar}>
              <h2>Questions</h2>
            </div>
            <div className={styles.boxContent}>
              <ul className={styles.list}>
                {FAQ_SECTIONS.map((section) => (
                  <li key={section.id}>
                    <strong>
                      <HashLink to={`#${section.id}`}>{section.title}</HashLink>
                    </strong>
                    <ul>
                      {section.items.map((item) => (
                        <li key={item.id}>
                          <HashLink to={`#${item.id}`}>{item.question}</HashLink>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className={styles.rightColumn}>
            {FAQ_SECTIONS.map((section) => (
              <section key={section.id} id={section.id} className={`${styles.box} ${styles.rightBox} ${styles.section}`} aria-labelledby={`${section.id}-heading`}>
                <div className={styles.boxBar}>
                  <h2 id={`${section.id}-heading`}>{section.title}</h2>
                </div>
                <div className={styles.boxContent}>
                  <dl>
                    {section.items.map((item, itemIndex) => (
                      <div key={item.id}>
                        <dt className={itemIndex === 0 ? styles.first : undefined} id={item.id}>
                          {item.question}
                        </dt>
                        <dd>{item.answer}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </section>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default FAQ;
