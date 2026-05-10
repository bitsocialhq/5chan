import styles from './filters-protip.module.css';

const FiltersProtip = () => {
  return (
    <div className={styles.filtersProtip}>
      <h4>Patterns</h4>
      <ul>
        <li>
          <strong>Matching whole words:</strong>
        </li>
        <li>
          <code>feel</code>: will match <em>"feel"</em> but not <em>"feeling"</em>. This search is case-insensitive.
        </li>
      </ul>
      <ul>
        <li>
          <strong>AND operator:</strong>
        </li>
        <li>
          <code>feel girlfriend</code>: will match <em>"feel"</em> AND <em>"girlfriend"</em> in any order.
        </li>
      </ul>
      <ul>
        <li>
          <strong>OR operator:</strong>
        </li>
        <li>
          <code>feel|girlfriend</code>: will match <em>"feel"</em> OR <em>"girlfriend"</em>.
        </li>
      </ul>
      <ul>
        <li>
          <strong>Mixing both operators:</strong>
        </li>
        <li>
          <code>girlfriend|boyfriend feel</code>: matches <em>"feel"</em> AND <em>"girlfriend"</em>, or <em>"feel"</em> AND <em>"boyfriend"</em>.
        </li>
      </ul>
      <ul>
        <li>
          <strong>Exact match search:</strong>
        </li>
        <li>
          <code>"that feel when"</code>: place double quotes around the pattern to search for an exact string.
        </li>
      </ul>
      <ul>
        <li>
          <strong>Wildcards:</strong>
        </li>
        <li>
          <code>feel*</code>: matches expressions such as <em>"feel"</em>, <em>"feels"</em>, <em>"feeling"</em>, <em>"feeler"</em>, etc…
        </li>
        <li>
          <code>idolm*ster</code>: this can match <em>"idolmaster"</em> or <em>"idolm@ster"</em>, etc…
        </li>
      </ul>
      <ul>
        <strong>Filtering by display name or user ID</strong>
        <li>
          Prefix the pattern with <code>#</code> to search by <em>user ID</em>: <code>#GPPr4CQSRCt8</code>
        </li>
        <li>
          Prefix the pattern with <code>##</code> to search by <em>name</em>: <code>##Anonymous</code>
        </li>
        <li>
          To filter by <em>role</em>: <code>#!#owner</code>, <code>#!#admin</code>, <code>#!#moderator</code> (or <code>#!#mod</code>)
        </li>
      </ul>
      <ul>
        <strong>It is also possible to filter by regular expression:</strong>
        <li>
          <code>/^(?=.*detachable)(?=.*hats).*$/i</code>: AND operator.
        </li>
        <li>
          <code>/^(?!.*touhou).*$/i</code>: NOT operator.
        </li>
        <li>
          <code>{'/^&gt;/'}</code>: threads starting with a quote (<em>{'">"'}</em> character as an html entity).
        </li>
        <li>
          <code>/^$/</code>: threads with no text.
        </li>
      </ul>
      <h4>Controls</h4>
      <ul>
        <li>
          <strong>On</strong>: enables or disables the filter.
        </li>
        <li>
          <strong>Color</strong>: highlights matched threads with the specified color.
        </li>
        <li>
          <strong>Hide</strong>: hides matched threads.
        </li>
        <li>
          <strong>Top</strong>: moves the filter to the top of the feed.
        </li>
      </ul>
    </div>
  );
};

export default FiltersProtip;
