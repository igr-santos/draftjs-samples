import {
  BlockMapBuilder,
  CharacterMetadata,
  ContentBlock,
  Modifier,
  EditorState,
  genKey
} from 'draft-js';
import { List, Repeat } from 'immutable';


export default {

  insertMedia(editorState, entityKey, character) {
    const contentState = editorState.getCurrentContent();
    const selectionState = editorState.getSelection();

    const afterRemoval = Modifier.removeRange(
      contentState,
      selectionState,
      'backward'
    );

    const targetSelection = afterRemoval.getSelectionAfter();
    const afterSplit = Modifier.splitBlock(afterRemoval, targetSelection);
    const insertionTarget = afterSplit.getSelectionAfter();

    const asMedia = Modifier.setBlockType(
      afterSplit,
      insertionTarget,
      'block-media'
    );

    const charData = CharacterMetadata.create({ entity: entityKey });

    const fragmentArray = [
      new ContentBlock({
        key: genKey(),
        type: 'block-media',
        text: character,
        characterList: List(Repeat(charData, character.length)),
      }),
      new ContentBlock({
        key: genKey(),
        type: 'unstyled',
        text: '',
        characterList: List(),
      }),
    ];

    const fragment = BlockMapBuilder.createFromArray(fragmentArray);

    const withMedia = Modifier.replaceWithFragment(
      asMedia,
      insertionTarget,
      fragment
    );

    const newContent = withMedia.merge({
      selectionBefore: selectionState,
      selectionAfter: withMedia.getSelectionAfter().set('hasFocus', true),
    });

    return EditorState.push(editorState, newContent, 'insert-fragment');
  },


};
