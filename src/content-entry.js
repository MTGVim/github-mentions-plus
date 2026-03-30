import getCaretCoordinates from 'textarea-caret';
import {
  computePosition,
  flip,
  limitShift,
  offset,
  shift
} from '@floating-ui/dom';

const contentEntryRoot = typeof window !== 'undefined' ? window : globalThis;
contentEntryRoot.GitHubMentionsVendor = {
  getCaretCoordinates,
  computePosition,
  flip,
  limitShift,
  offset,
  shift
};

import '../utils/settings.js';
import '../utils/storage.js';
import '../utils/api.js';
import '../utils/lgtm.js';
import '../utils/overlay/state.js';
import '../utils/overlay/anchor.js';
import '../utils/overlay/position.js';
import '../utils/overlay/render.js';
import '../utils/overlay/navigation.js';
import '../utils/dom.js';
import '../content/triggers.js';
import '../content/commands.js';
import '../content/users-source.js';
import '../content/app.js';
import '../content_script.js';
