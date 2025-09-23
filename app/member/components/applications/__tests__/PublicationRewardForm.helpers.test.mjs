import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldDisableSubmitButton,
  getAuthorSubmissionFields,
} from '../PublicationRewardForm.helpers.mjs';

test('shouldDisableSubmitButton enforces declarations and required author fields before enabling submit', () => {
  const baseState = {
    loading: false,
    saving: false,
    subcategoryId: 10,
    subcategoryBudgetId: 20,
    declarations: {
      confirmNoPreviousFunding: false,
      agreeToRegulations: false,
    },
    authorNameList: '',
    signature: '',
  };

  assert.equal(shouldDisableSubmitButton(baseState), true);

  const withAuthors = {
    ...baseState,
    authorNameList: 'Alice, Bob',
  };
  assert.equal(shouldDisableSubmitButton(withAuthors), true);

  const withSignature = {
    ...baseState,
    authorNameList: 'Alice, Bob',
    signature: '  ',
    declarations: {
      confirmNoPreviousFunding: true,
      agreeToRegulations: false,
    },
  };
  assert.equal(shouldDisableSubmitButton(withSignature), true);

  const oneChecked = {
    ...baseState,
    authorNameList: 'Alice, Bob',
    signature: 'Professor Example',
    declarations: {
      confirmNoPreviousFunding: true,
      agreeToRegulations: false,
    },
  };
  assert.equal(shouldDisableSubmitButton(oneChecked), true);

  const bothChecked = {
    ...baseState,
    authorNameList: 'Alice, Bob',
    signature: 'Professor Example',
    declarations: {
      confirmNoPreviousFunding: true,
      agreeToRegulations: true,
    },
  };
  assert.equal(shouldDisableSubmitButton(bothChecked), false);
});

test('getAuthorSubmissionFields maps trimmed author fields for submission payload', () => {
  const populated = getAuthorSubmissionFields({
    author_name_list: '  Author One, Author Two  ',
    signature: '  Dr. Example  ',
  });

  assert.equal(populated.author_name_list, 'Author One, Author Two');
  assert.equal(populated.signature, 'Dr. Example');

  const empty = getAuthorSubmissionFields();
  assert.equal(empty.author_name_list, '');
  assert.equal(empty.signature, '');
});