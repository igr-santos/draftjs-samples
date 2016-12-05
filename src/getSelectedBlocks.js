export default (contentState, anchorKey, focusKey) => {
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
}
