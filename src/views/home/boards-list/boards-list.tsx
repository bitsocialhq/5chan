import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccountCommunityAddresses } from '../../../hooks/use-account-community-addresses';
import { useDirectoriesState, DirectoryCommunity } from '../../../hooks/use-directories';
import { getBoardPath } from '../../../lib/utils/route-utils';
import useDisclaimerModalStore from '../../../stores/use-disclaimer-modal-store';
import useDirectoryModalStore from '../../../stores/use-directory-modal-store';
import useBoardsFilterStore from '../../../stores/use-boards-filter-store';
import BoardsFilterModal from './boards-filter-modal';
import styles from '../home.module.css';

const getBoardNameFromDirectoryTitle = (title: string): string => {
  const match = title.match(/^\/[^/]+\/\s*-\s*(.+)$/);
  return match?.[1]?.trim() || title.trim();
};

const NSFWBadge = () => {
  return (
    <>
      &nbsp;
      <h3 className={styles.nsfwBadge}>
        <span title='Not Safe For Work'>
          <sup>(NSFW)</sup>
        </span>
      </h3>
    </>
  );
};

interface BoardLinkProps {
  boardName: string;
  address: string | null;
  getBoardLink: (address: string) => string;
  onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, address: string) => void;
  onPlaceholderClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const BoardLink = ({ boardName, address, getBoardLink, onLinkClick, onPlaceholderClick }: BoardLinkProps) => {
  if (address) {
    return (
      <li>
        <Link to={getBoardLink(address)} onClick={(e) => onLinkClick(e, address)}>
          {boardName}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <Link to='#' onClick={onPlaceholderClick} className={styles.placeholder}>
        {boardName}
      </Link>
    </li>
  );
};

const DirectoriesErrorMessage = () => {
  const error = useDirectoriesState().error;
  return error?.message ? <div className='red'>{error.message}</div> : null;
};

const ModeratedBoardsLink = () => {
  const { t } = useTranslation();
  const accountCommunityAddresses = useAccountCommunityAddresses();

  if (accountCommunityAddresses.length === 0) {
    return null;
  }

  return (
    <li>
      <Link to='/mod'>{t('boards_you_moderate_nav')}</Link>
    </li>
  );
};

const BoardsList = ({ multisub }: { multisub: DirectoryCommunity[] }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const showDisclaimerModal = useDisclaimerModalStore((state) => state.showDisclaimerModal);
  const openDirectoryModal = useDirectoryModalStore((state) => state.openDirectoryModal);
  const useCatalogLinks = useBoardsFilterStore((state) => state.useCatalogLinks);
  const boardFilter = useBoardsFilterStore((state) => state.boardFilter);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, address: string) => {
    e.preventDefault();
    const boardPath = getBoardPath(address, multisub);
    const targetPath = boardPath + (useCatalogLinks ? '/catalog' : '');
    showDisclaimerModal(address, navigate, targetPath);
  };

  // Helper to generate link URL with optional catalog suffix
  const getBoardLink = (address: string | null): string => {
    if (!address) return '#';
    const boardPath = getBoardPath(address, multisub);
    return `/${boardPath}${useCatalogLinks ? '/catalog' : ''}`;
  };

  // Handler for placeholder board links
  const handlePlaceholderClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    openDirectoryModal();
  };

  const boardAddressesByName = multisub.reduce<Record<string, string>>((acc, community) => {
    if (!community.title) return acc;
    const boardName = getBoardNameFromDirectoryTitle(community.title);
    if (!acc[boardName]) {
      acc[boardName] = community.address;
    }
    return acc;
  }, {});

  const boardLinkProps = {
    getBoardLink,
    onLinkClick: handleLinkClick,
    onPlaceholderClick: handlePlaceholderClick,
  };

  // Filtering logic: determine which categories to show
  const showAll = boardFilter === 'all';
  const showNsfwOnly = boardFilter === 'nsfw';
  const showWorksafeOnly = boardFilter === 'worksafe';

  // Category visibility based on filter
  const showJapaneseCulture = showAll || showWorksafeOnly || showNsfwOnly;
  const showVideoGames = showAll || showWorksafeOnly;
  const showInterests = showAll || showWorksafeOnly;
  const showCreative = showAll || showWorksafeOnly || showNsfwOnly;
  const showOther = showAll || showWorksafeOnly;
  const showMisc = showAll || showNsfwOnly;
  const showAdult = showAll || showNsfwOnly;
  const showMultiboards = showAll || showNsfwOnly;

  return (
    <div className={styles.box}>
      <div className={`${styles.boxBar} ${styles.color2ColorBar}`}>
        <h2 className='capitalize'>{t('boards')}</h2>
        <BoardsFilterModal />
      </div>
      <div className={`${styles.boxContent} ${styles.boardsContent}`}>
        <DirectoriesErrorMessage />
        {/* Column 1: Japanese Culture + Video Games */}
        {(showJapaneseCulture || showVideoGames) && (
          <div className={styles.boardsColumn}>
            {/* Japanese Culture */}
            {showJapaneseCulture && (
              <>
                <h3>Japanese Culture</h3>
                <ul>
                  {(showAll || showWorksafeOnly) && (
                    <>
                      <BoardLink
                        key={boardAddressesByName['Anime & Manga'] ?? 'Anime & Manga'}
                        boardName='Anime & Manga'
                        address={boardAddressesByName['Anime & Manga'] ?? null}
                        {...boardLinkProps}
                      />
                      <BoardLink
                        key={boardAddressesByName['Anime/Cute'] ?? 'Anime/Cute'}
                        boardName='Anime/Cute'
                        address={boardAddressesByName['Anime/Cute'] ?? null}
                        {...boardLinkProps}
                      />
                      <BoardLink
                        key={boardAddressesByName['Anime/Wallpapers'] ?? 'Anime/Wallpapers'}
                        boardName='Anime/Wallpapers'
                        address={boardAddressesByName['Anime/Wallpapers'] ?? null}
                        {...boardLinkProps}
                      />
                      <BoardLink key={boardAddressesByName['Mecha'] ?? 'Mecha'} boardName='Mecha' address={boardAddressesByName['Mecha'] ?? null} {...boardLinkProps} />
                      <BoardLink
                        key={boardAddressesByName['Cosplay & EGL'] ?? 'Cosplay & EGL'}
                        boardName='Cosplay & EGL'
                        address={boardAddressesByName['Cosplay & EGL'] ?? null}
                        {...boardLinkProps}
                      />
                      <BoardLink
                        key={boardAddressesByName['Cute/Male'] ?? 'Cute/Male'}
                        boardName='Cute/Male'
                        address={boardAddressesByName['Cute/Male'] ?? null}
                        {...boardLinkProps}
                      />
                    </>
                  )}
                  {(showAll || showNsfwOnly) && (
                    <BoardLink key={boardAddressesByName['Flash'] ?? 'Flash'} boardName='Flash' address={boardAddressesByName['Flash'] ?? null} {...boardLinkProps} />
                  )}
                  {(showAll || showWorksafeOnly) && (
                    <>
                      <BoardLink
                        key={boardAddressesByName['Transportation'] ?? 'Transportation'}
                        boardName='Transportation'
                        address={boardAddressesByName['Transportation'] ?? null}
                        {...boardLinkProps}
                      />
                      <BoardLink
                        key={boardAddressesByName['Otaku Culture'] ?? 'Otaku Culture'}
                        boardName='Otaku Culture'
                        address={boardAddressesByName['Otaku Culture'] ?? null}
                        {...boardLinkProps}
                      />
                      <BoardLink
                        key={boardAddressesByName['Virtual YouTubers'] ?? 'Virtual YouTubers'}
                        boardName='Virtual YouTubers'
                        address={boardAddressesByName['Virtual YouTubers'] ?? null}
                        {...boardLinkProps}
                      />
                    </>
                  )}
                </ul>
              </>
            )}

            {/* Video Games */}
            {showVideoGames && (
              <>
                <h3>Video Games</h3>
                <ul>
                  <BoardLink
                    key={boardAddressesByName['Video Games'] ?? 'Video Games'}
                    boardName='Video Games'
                    address={boardAddressesByName['Video Games'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Video Game Generals'] ?? 'Video Game Generals'}
                    boardName='Video Game Generals'
                    address={boardAddressesByName['Video Game Generals'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Video Games/Multiplayer'] ?? 'Video Games/Multiplayer'}
                    boardName='Video Games/Multiplayer'
                    address={boardAddressesByName['Video Games/Multiplayer'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Video Games/Mobile'] ?? 'Video Games/Mobile'}
                    boardName='Video Games/Mobile'
                    address={boardAddressesByName['Video Games/Mobile'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Pokémon'] ?? 'Pokémon'}
                    boardName='Pokémon'
                    address={boardAddressesByName['Pokémon'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Retro Games'] ?? 'Retro Games'}
                    boardName='Retro Games'
                    address={boardAddressesByName['Retro Games'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Video Games/RPG'] ?? 'Video Games/RPG'}
                    boardName='Video Games/RPG'
                    address={boardAddressesByName['Video Games/RPG'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Video Games/Strategy'] ?? 'Video Games/Strategy'}
                    boardName='Video Games/Strategy'
                    address={boardAddressesByName['Video Games/Strategy'] ?? null}
                    {...boardLinkProps}
                  />
                </ul>
              </>
            )}
          </div>
        )}

        {/* Column 2: Interests */}
        {showInterests && (
          <div className={styles.boardsColumn}>
            <h3>Interests</h3>
            <ul>
              <BoardLink
                key={boardAddressesByName['Comics & Cartoons'] ?? 'Comics & Cartoons'}
                boardName='Comics & Cartoons'
                address={boardAddressesByName['Comics & Cartoons'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink
                key={boardAddressesByName['Technology'] ?? 'Technology'}
                boardName='Technology'
                address={boardAddressesByName['Technology'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink
                key={boardAddressesByName['Television & Film'] ?? 'Television & Film'}
                boardName='Television & Film'
                address={boardAddressesByName['Television & Film'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink key={boardAddressesByName['Weapons'] ?? 'Weapons'} boardName='Weapons' address={boardAddressesByName['Weapons'] ?? null} {...boardLinkProps} />
              <BoardLink key={boardAddressesByName['Auto'] ?? 'Auto'} boardName='Auto' address={boardAddressesByName['Auto'] ?? null} {...boardLinkProps} />
              <BoardLink
                key={boardAddressesByName['Animals & Nature'] ?? 'Animals & Nature'}
                boardName='Animals & Nature'
                address={boardAddressesByName['Animals & Nature'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink
                key={boardAddressesByName['Traditional Games'] ?? 'Traditional Games'}
                boardName='Traditional Games'
                address={boardAddressesByName['Traditional Games'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink key={boardAddressesByName['Sports'] ?? 'Sports'} boardName='Sports' address={boardAddressesByName['Sports'] ?? null} {...boardLinkProps} />
              <BoardLink
                key={boardAddressesByName['Extreme Sports'] ?? 'Extreme Sports'}
                boardName='Extreme Sports'
                address={boardAddressesByName['Extreme Sports'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink
                key={boardAddressesByName['Professional Wrestling'] ?? 'Professional Wrestling'}
                boardName='Professional Wrestling'
                address={boardAddressesByName['Professional Wrestling'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink
                key={boardAddressesByName['Science & Math'] ?? 'Science & Math'}
                boardName='Science & Math'
                address={boardAddressesByName['Science & Math'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink
                key={boardAddressesByName['History & Humanities'] ?? 'History & Humanities'}
                boardName='History & Humanities'
                address={boardAddressesByName['History & Humanities'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink
                key={boardAddressesByName['International'] ?? 'International'}
                boardName='International'
                address={boardAddressesByName['International'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink
                key={boardAddressesByName['Outdoors'] ?? 'Outdoors'}
                boardName='Outdoors'
                address={boardAddressesByName['Outdoors'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink key={boardAddressesByName['Toys'] ?? 'Toys'} boardName='Toys' address={boardAddressesByName['Toys'] ?? null} {...boardLinkProps} />
            </ul>
          </div>
        )}

        {/* Column 3: Creative */}
        {showCreative && (
          <div className={styles.boardsColumn}>
            <h3>Creative</h3>
            <ul>
              {(showAll || showNsfwOnly) && (
                <BoardLink key={boardAddressesByName['Oekaki'] ?? 'Oekaki'} boardName='Oekaki' address={boardAddressesByName['Oekaki'] ?? null} {...boardLinkProps} />
              )}
              {(showAll || showWorksafeOnly) && (
                <>
                  <BoardLink
                    key={boardAddressesByName['Papercraft & Origami'] ?? 'Papercraft & Origami'}
                    boardName='Papercraft & Origami'
                    address={boardAddressesByName['Papercraft & Origami'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Photography'] ?? 'Photography'}
                    boardName='Photography'
                    address={boardAddressesByName['Photography'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Food & Cooking'] ?? 'Food & Cooking'}
                    boardName='Food & Cooking'
                    address={boardAddressesByName['Food & Cooking'] ?? null}
                    {...boardLinkProps}
                  />
                </>
              )}
              {(showAll || showNsfwOnly) && (
                <BoardLink
                  key={boardAddressesByName['Artwork/Critique'] ?? 'Artwork/Critique'}
                  boardName='Artwork/Critique'
                  address={boardAddressesByName['Artwork/Critique'] ?? null}
                  {...boardLinkProps}
                />
              )}
              {(showAll || showNsfwOnly) && (
                <BoardLink
                  key={boardAddressesByName['Wallpapers/General'] ?? 'Wallpapers/General'}
                  boardName='Wallpapers/General'
                  address={boardAddressesByName['Wallpapers/General'] ?? null}
                  {...boardLinkProps}
                />
              )}
              {(showAll || showWorksafeOnly) && (
                <>
                  <BoardLink
                    key={boardAddressesByName['Literature'] ?? 'Literature'}
                    boardName='Literature'
                    address={boardAddressesByName['Literature'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink key={boardAddressesByName['Music'] ?? 'Music'} boardName='Music' address={boardAddressesByName['Music'] ?? null} {...boardLinkProps} />
                  <BoardLink
                    key={boardAddressesByName['Fashion'] ?? 'Fashion'}
                    boardName='Fashion'
                    address={boardAddressesByName['Fashion'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink key={boardAddressesByName['3DCG'] ?? '3DCG'} boardName='3DCG' address={boardAddressesByName['3DCG'] ?? null} {...boardLinkProps} />
                  <BoardLink
                    key={boardAddressesByName['Graphic Design'] ?? 'Graphic Design'}
                    boardName='Graphic Design'
                    address={boardAddressesByName['Graphic Design'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Do It Yourself'] ?? 'Do It Yourself'}
                    boardName='Do It Yourself'
                    address={boardAddressesByName['Do It Yourself'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Worksafe GIF'] ?? 'Worksafe GIF'}
                    boardName='Worksafe GIF'
                    address={boardAddressesByName['Worksafe GIF'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink key={boardAddressesByName['Quests'] ?? 'Quests'} boardName='Quests' address={boardAddressesByName['Quests'] ?? null} {...boardLinkProps} />
                </>
              )}
            </ul>
          </div>
        )}

        {/* Column 4: Other + Misc. */}
        {(showOther || showMisc) && (
          <div className={styles.boardsColumn}>
            {/* Other */}
            {showOther && (
              <>
                <h3>Other</h3>
                <ul>
                  <BoardLink
                    key={boardAddressesByName['Business & Finance'] ?? 'Business & Finance'}
                    boardName='Business & Finance'
                    address={boardAddressesByName['Business & Finance'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink key={boardAddressesByName['Travel'] ?? 'Travel'} boardName='Travel' address={boardAddressesByName['Travel'] ?? null} {...boardLinkProps} />
                  <BoardLink
                    key={boardAddressesByName['Fitness'] ?? 'Fitness'}
                    boardName='Fitness'
                    address={boardAddressesByName['Fitness'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Paranormal'] ?? 'Paranormal'}
                    boardName='Paranormal'
                    address={boardAddressesByName['Paranormal'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink key={boardAddressesByName['Advice'] ?? 'Advice'} boardName='Advice' address={boardAddressesByName['Advice'] ?? null} {...boardLinkProps} />
                  <BoardLink key={boardAddressesByName['LGBT'] ?? 'LGBT'} boardName='LGBT' address={boardAddressesByName['LGBT'] ?? null} {...boardLinkProps} />
                  <BoardLink key={boardAddressesByName['Pony'] ?? 'Pony'} boardName='Pony' address={boardAddressesByName['Pony'] ?? null} {...boardLinkProps} />
                  <BoardLink
                    key={boardAddressesByName['Current News'] ?? 'Current News'}
                    boardName='Current News'
                    address={boardAddressesByName['Current News'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Worksafe Requests'] ?? 'Worksafe Requests'}
                    boardName='Worksafe Requests'
                    address={boardAddressesByName['Worksafe Requests'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Very Important Posts'] ?? 'Very Important Posts'}
                    boardName='Very Important Posts'
                    address={boardAddressesByName['Very Important Posts'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['5chan Feedback'] ?? '5chan Feedback'}
                    boardName='5chan Feedback'
                    address={boardAddressesByName['5chan Feedback'] ?? null}
                    {...boardLinkProps}
                  />
                </ul>
              </>
            )}

            {/* Misc. (NSFW) */}
            {showMisc && (
              <>
                <h3>Misc.</h3>
                <NSFWBadge />
                <ul>
                  <BoardLink key={boardAddressesByName['Random'] ?? 'Random'} boardName='Random' address={boardAddressesByName['Random'] ?? null} {...boardLinkProps} />
                  <BoardLink
                    key={boardAddressesByName['ROBOT9002'] ?? 'ROBOT9002'}
                    boardName='ROBOT9002'
                    address={boardAddressesByName['ROBOT9002'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Politically Incorrect'] ?? 'Politically Incorrect'}
                    boardName='Politically Incorrect'
                    address={boardAddressesByName['Politically Incorrect'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['International/Random'] ?? 'International/Random'}
                    boardName='International/Random'
                    address={boardAddressesByName['International/Random'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Cams & Meetups'] ?? 'Cams & Meetups'}
                    boardName='Cams & Meetups'
                    address={boardAddressesByName['Cams & Meetups'] ?? null}
                    {...boardLinkProps}
                  />
                  <BoardLink
                    key={boardAddressesByName['Shit 5chan Says'] ?? 'Shit 5chan Says'}
                    boardName='Shit 5chan Says'
                    address={boardAddressesByName['Shit 5chan Says'] ?? null}
                    {...boardLinkProps}
                  />
                </ul>
              </>
            )}
          </div>
        )}

        {/* Column 5: Adult (NSFW) */}
        {showAdult && (
          <div className={styles.boardsColumn}>
            <h3>Adult</h3>
            <NSFWBadge />
            <ul>
              <BoardLink
                key={boardAddressesByName['Sexy Beautiful Women'] ?? 'Sexy Beautiful Women'}
                boardName='Sexy Beautiful Women'
                address={boardAddressesByName['Sexy Beautiful Women'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink
                key={boardAddressesByName['Hardcore'] ?? 'Hardcore'}
                boardName='Hardcore'
                address={boardAddressesByName['Hardcore'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink
                key={boardAddressesByName['Handsome Men'] ?? 'Handsome Men'}
                boardName='Handsome Men'
                address={boardAddressesByName['Handsome Men'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink key={boardAddressesByName['Hentai'] ?? 'Hentai'} boardName='Hentai' address={boardAddressesByName['Hentai'] ?? null} {...boardLinkProps} />
              <BoardLink key={boardAddressesByName['Ecchi'] ?? 'Ecchi'} boardName='Ecchi' address={boardAddressesByName['Ecchi'] ?? null} {...boardLinkProps} />
              <BoardLink key={boardAddressesByName['Yuri'] ?? 'Yuri'} boardName='Yuri' address={boardAddressesByName['Yuri'] ?? null} {...boardLinkProps} />
              <BoardLink
                key={boardAddressesByName['Hentai/Alternative'] ?? 'Hentai/Alternative'}
                boardName='Hentai/Alternative'
                address={boardAddressesByName['Hentai/Alternative'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink key={boardAddressesByName['Yaoi'] ?? 'Yaoi'} boardName='Yaoi' address={boardAddressesByName['Yaoi'] ?? null} {...boardLinkProps} />
              <BoardLink
                key={boardAddressesByName['Torrents'] ?? 'Torrents'}
                boardName='Torrents'
                address={boardAddressesByName['Torrents'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink
                key={boardAddressesByName['High Resolution'] ?? 'High Resolution'}
                boardName='High Resolution'
                address={boardAddressesByName['High Resolution'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink
                key={boardAddressesByName['Adult GIF'] ?? 'Adult GIF'}
                boardName='Adult GIF'
                address={boardAddressesByName['Adult GIF'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink
                key={boardAddressesByName['Adult Cartoons'] ?? 'Adult Cartoons'}
                boardName='Adult Cartoons'
                address={boardAddressesByName['Adult Cartoons'] ?? null}
                {...boardLinkProps}
              />
              <BoardLink
                key={boardAddressesByName['Adult Requests'] ?? 'Adult Requests'}
                boardName='Adult Requests'
                address={boardAddressesByName['Adult Requests'] ?? null}
                {...boardLinkProps}
              />
            </ul>
          </div>
        )}

        {/* Column 6: Meta */}
        {showMultiboards && (
          <div className={styles.boardsColumn}>
            <h3>Multiboards</h3>
            <NSFWBadge />
            <ul>
              <li>
                <Link to='/all'>All 5chan Directories</Link>
              </li>
              <li>
                <Link to='/subs'>Subscriptions</Link>
              </li>
              <ModeratedBoardsLink />
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardsList;
