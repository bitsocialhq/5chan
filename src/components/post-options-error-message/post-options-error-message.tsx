import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { DirectoryCommunity } from '../../hooks/use-directories';
import type { PostOptionsValidationError } from '../../lib/utils/post-options-utils';

interface PostOptionsErrorMessageProps {
  directories?: DirectoryCommunity[];
  error: PostOptionsValidationError;
}

const EMPTY_DIRECTORIES: DirectoryCommunity[] = [];
const DIRECTORY_TITLE_CODE_PATTERN = /^\/([^/]+)\//;
const DIRECTORY_TITLE_LABEL_PATTERN = /^\/[^/]+\//;

const getDirectoryCode = (directory: DirectoryCommunity): string | undefined => directory.directoryCode ?? directory.title?.match(DIRECTORY_TITLE_CODE_PATTERN)?.[1];

const getDirectoryLabel = (code: string, directories: DirectoryCommunity[]): string => {
  const directory = directories.find((entry) => getDirectoryCode(entry) === code);
  return directory?.title?.match(DIRECTORY_TITLE_LABEL_PATTERN)?.[0] ?? `/${code}/`;
};

const DirectoryLinks = ({ codes, directories }: { codes: string[]; directories: DirectoryCommunity[] }) => (
  <>
    {codes.map((code, index) => {
      const separator = index === 0 ? '' : ', ';
      return (
        <Fragment key={code}>
          {separator}
          <Link to={`/${code}`}>{getDirectoryLabel(code, directories)}</Link>
        </Fragment>
      );
    })}
  </>
);

const PostOptionsErrorMessage = ({ directories = EMPTY_DIRECTORIES, error }: PostOptionsErrorMessageProps) => {
  return (
    <>
      Unsupported options: {error.unsupportedOptions.join(', ')}.
      {error.supportedDirectoryCodesByOption.map(({ option, directoryCodes }) => (
        <Fragment key={option}>
          {' '}
          Option "{option}" is supported on: <DirectoryLinks codes={directoryCodes} directories={directories} />.
        </Fragment>
      ))}
    </>
  );
};

export default PostOptionsErrorMessage;
