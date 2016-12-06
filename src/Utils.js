import { EditorState, Entity, Modifier, SelectionState } from 'draft-js';

/*
 * getSelectedBlocks
 */
export const getSelectedBlocks = (contentState, anchorKey, focusKey) => {
  const isSameBlock = anchorKey === focusKey;
  const startingBlock = contentState.getBlockForKey(anchorKey);

  if (!startingBlock) {
    return [];
  }

  let selectedBlocks = [startingBlock];

  if (!isSameBlock) {
    let blockKey = anchorKey;

    while (blockKey !== focusKey) {
      const nextBlock = contentState.getBlockAfter(blockKey);
      if (!nextBlock) {
        selectedBlocks = [];
        break;
      }
      selectedBlocks.push(nextBlock);
      blockKey = nextBlock.getKey();
    }
  }

  return selectedBlocks;
};

/*
 * Utils.js
 *
 * - toggleLink(editorState: EditorState, data: object)
 */
export default {

  toggleLink: (editorState, data) => {
    // Save editorState then apply link in loop
    let editorStateMutable = editorState;

    const selection = editorState.getSelection();
    const contentState = editorState.getCurrentContent();

    const anchorKey = selection.getStartKey();
    const focusKey = selection.getEndKey();

    const arrayBlocks = getSelectedBlocks(contentState, anchorKey, focusKey);

    // Should create entity when text select
    // and merge entity data when block type selected is atomic
    let entityKey = '';

    arrayBlocks.forEach(block => {
      // When block is atomic, only has entity
      const entity = block.getEntityAt(0);
      if (entity) {
        Entity.mergeData(entity, data);
      } else {
        if (entityKey === '') {
          // If not pass data, remove entity applying null
          entityKey = data ? Entity.create('LINK', 'MUTABLE', data) : undefined;
        }

        // Selection for this block
        const blockKey = block.getKey();
        const startOffset = blockKey === anchorKey ? selection.getStartOffset() : 0;
        const endOffset = blockKey === focusKey ? selection.getEndOffset() : block.getText().length;

        const blockSelectionState = SelectionState
          .createEmpty(blockKey)
          .merge({
            anchorOffset: startOffset,
            focusOffset: endOffset
          });

        // Toggle link

        const contentStateWithLink = Modifier.applyEntity(
          // Apply entity in content mutable to ensure
          // that link before loop has been applied
          editorStateMutable.getCurrentContent(),
          blockSelectionState,
          entityKey
        );

        editorStateMutable = EditorState.push(
          editorStateMutable,
          contentStateWithLink,
          'apply-entity'
        );
      }
    });

    return editorStateMutable;
  },

  toggleAlignment: (editorState, alignment) => {
    const removeAlignments = ['left', 'center', 'right'].filter(align => alignment !== align);

    let currentContent = editorState.getCurrentContent();
    let selection = editorState.getSelection();
    let focusBlock = currentContent.getBlockForKey(selection.getFocusKey());
    let anchorBlock = currentContent.getBlockForKey(selection.getAnchorKey());
    let selectionIsBackward = selection.getIsBackward();

    let changes = {
      anchorOffset: 0,
      focusOffset: focusBlock.getLength()
    }

    if (selectionIsBackward) {
      changes = {
        focusOffset: 0,
        anchorOffset: anchorBlock.getLength()
      }
    }
     let selectWholeBlocks = selection.merge(changes)
     let modifiedContent = Modifier.applyInlineStyle(currentContent, selectWholeBlocks, alignment);
     let finalContent = removeAlignments.reduce(function(content, alignment) {
        return Modifier.removeInlineStyle(content, selectWholeBlocks, alignment);
     }, modifiedContent);
     return EditorState.push(editorState, finalContent, 'change-alingment-block');
  },

};
