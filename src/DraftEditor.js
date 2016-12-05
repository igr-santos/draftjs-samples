import React, { Component } from 'react';
import {
  AtomicBlockUtils,
  CompositeDecorator,
  ContentBlock,
  Editor,
  EditorState,
  Entity,
  Modifier,
  SelectionState,
  convertToRaw,
  // Import handleKeyCommand
  genKey,
} from 'draft-js';

// Import handleKeyCommand
import { OrderedMap } from 'immutable';

import Image from './Image';
import Link, { findLinkEntities } from './Link';
/*import getSelectedBlocks from './getSelectedBlocks';*/

import Utils, { getSelectedBlocks } from './Utils';


const decorators = new CompositeDecorator([
  {
    strategy: findLinkEntities,
    component: Link,
  },
]);


class DraftEditor extends Component {

  constructor(props) {
    super(props);

    this.state = { editorState: EditorState.createEmpty(decorators), readOnly: false };
  }

  setEditorState(editorState) {
    console.log('selection', editorState.getSelection().toJS());
    this.setState({ editorState });
  }

  toggleReadOnly() {
    this.setState({ readOnly: !this.state.readOnly }, () => {
      setTimeout(() => this.refs.editor.focus(), 0);
    });
  }

  logRawContentState() {
    const contentState = this.state.editorState.getCurrentContent();

    const rawContentState = convertToRaw(contentState);
    console.log('RawContentState', rawContentState);
    this.setState({ rawContentState });
  }

  insertImage() {
    const { editorState } = this.state;
    const imageUrl = 'https://s1.vagalume.com/bananas-de-pijamas/images/profile-bigw314.jpg';

    const entityKey = Entity.create('image', 'IMMUTABLE', { src: imageUrl });

    this.setEditorState(AtomicBlockUtils.insertAtomicBlock(
      editorState,
      entityKey,
      ' '
    ));
  }

  handleToggleLink(link) {
    const { editorState } = this.state;
    let editorStateWithLink = editorState;

    const selection = editorState.getSelection();
    const contentState = editorState.getCurrentContent();

    const anchorKey = selection.getStartKey();
    const focusKey = selection.getEndKey();

    // Get blocks selected to apply entity by block
    const arrayBlocks = getSelectedBlocks(contentState, anchorKey, focusKey);

    let newEntityKey;
    arrayBlocks.map(contentBlock => {
      const entityKey = contentBlock.getEntityAt(0);
      if (entityKey) {
        Entity.mergeData(entityKey, { link });
      } else {
        if (newEntityKey === undefined) {
          newEntityKey = Entity.create('link', 'MUTABLE', { href: link });
        }
        const blockKey = contentBlock.getKey();
        const startOffset = blockKey === anchorKey ? selection.getStartOffset() : 0;
        const endOffset = blockKey === focusKey ? selection.getEndOffset() : contentBlock.getText().length;

        // Select only block
        const targetSelection = SelectionState
          .createEmpty(blockKey)
          .merge({
            anchorOffset: startOffset,
            focusOffset: endOffset
          });

        // Toggle link
        const contentStateWithLink = Modifier.applyEntity(
          editorStateWithLink.getCurrentContent(),
          targetSelection,
          newEntityKey
        )
        editorStateWithLink = EditorState.push(
          editorStateWithLink,
          contentStateWithLink,
          'apply-entity'
        )
      }
    });

    this.setEditorState(editorStateWithLink);
  }

  toggleLink() {
    const { editorState } = this.state;
    const linkUrl = 'http://ourcities.org';

    /*this.handleToggleLink(linkUrl);*/
    const editorStateWithLink = Utils.toggleLink(editorState, { href: linkUrl });
    this.setEditorState(editorStateWithLink);
  }

  handleKeyCommand(command) {
    const { editorState } = this.state;
    const currentBlock = editorState
      .getCurrentContent()
      .getBlockForKey(editorState.getSelection().getStartKey());

    // Modify behavior to insert new line
    if (command === 'split-block' && currentBlock.getType() === 'atomic') {
      // Create a contentBlock done to be insert
      const contentBlock = new ContentBlock({
        key: genKey(),
        type: 'unstyled'
      });
      const contentBlockMap = new OrderedMap([
        [contentBlock.getKey(), contentBlock]
      ])

      const currentContent = editorState.getCurrentContent();
      const currentBlockMap = currentContent.getBlockMap();

      // split blocks with current block
      const skipCurrent = block => block === currentBlock;
      const beforeBlocks = currentBlockMap.toSeq().takeUntil(skipCurrent);
      const afterBlocks = currentBlockMap
        .toSeq()
        .skipUntil(skipCurrent)
        .rest();

      let blockMap;
      if (editorState.getSelection().getAnchorOffset() < editorState.getSelection().getFocusOffset()) {
        // mount block map with new block to insert in place of old block
        blockMap = beforeBlocks.concat(
          contentBlockMap.toSeq(),
          afterBlocks
        ).toOrderedMap();
      } else {
        // mount block map with new block to insert before
        blockMap = beforeBlocks.concat(
          new OrderedMap([[currentBlock.getKey(), currentBlock]]).toSeq(),
          contentBlockMap.toSeq(),
          afterBlocks
        ).toOrderedMap();
      }

      const content = currentContent.merge({ blockMap })
      const editorStateWithLineBreak = EditorState.push(editorState, content, 'insert-new-line')

      this.setEditorState(EditorState.forceSelection(
        editorStateWithLineBreak,
        editorStateWithLineBreak.getSelection().merge({
          anchorKey: contentBlock.getKey(),
          anchorOffset: 0,
          isBackward: false
        })
      ))

      return true
    }
    return false
  }

  render() {
    return (
      <div>
        <div>
          <button onClick={this.insertImage.bind(this)}>Insert Image</button>
          <button onClick={this.toggleLink.bind(this)}>Insert Link</button>
        </div>
        <div style={{ height: 'auto', minHeight: '100px' }} onClick={() => this.refs.editor.focus()}>
          <Editor
            ref="editor"
            editorState={this.state.editorState}
            onChange={this.setEditorState.bind(this)}
            readOnly={this.state.readOnly}
            blockRendererFn={(block) => {
              if (block.getType() === 'atomic') {
                const entityKey = block.getEntityAt(0);
                const entity = entityKey ? Entity.get(entityKey) : undefined;

                if (entity && entity.getType() === 'image') {
                  return {
                    component: Image,
                  };
                }
              }
            }}
            handleKeyCommand={this.handleKeyCommand.bind(this)}
          />
        </div>
        <button onClick={this.logRawContentState.bind(this)}>Log Raw Content</button>
        <button onClick={this.toggleReadOnly.bind(this)}>{this.state.readOnly ?
        'Enable editor' : 'Disable editor'}</button>
        <hr />
        <p>{JSON.stringify(this.state.rawContentState, undefined, 4)}</p>
      </div>
    );
  }
}

export default DraftEditor;
