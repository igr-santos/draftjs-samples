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

import './DraftEditor.css';


const decorators = new CompositeDecorator([
  {
    strategy: findLinkEntities,
    component: Link,
  },
]);

const getBlockAlignment = (block) => {
  let style = 'left'
  block.findStyleRanges(e => {
    if (e.hasStyle('center')) style = 'center'
    if (e.hasStyle('right')) style = 'right'
  })
  return style
}


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
    /*const imageUrl = 'https://s1.vagalume.com/bananas-de-pijamas/images/profile-bigw314.jpg';*/
    const imageUrl = 'https://orig06.deviantart.net/7869/f/2009/131/9/e/zubat_icon_by_the_fry_bat.gif';

    // Check if insert image aside atomic block
    const selection = editorState.getSelection();
    const selectedBlock = editorState.getCurrentContent().getBlockForKey(selection.getStartKey());
    if (selectedBlock.getType() === 'atomic') {
      const blockKey = editorState.getCurrentContent().getKeyAfter(selectedBlock.getKey());
      if (blockKey) {
        const block = editorState.getCurrentContent().getBlockForKey(blockKey);
        const newEditorState = EditorState.forceSelection(
          editorState,
          editorState.getSelection().merge({
            anchorKey: block.getKey(),
            focusKey: block.getKey(),
            anchorOffset: 0,
            focusOffset: 0
          })
        );

        const entityKey = Entity.create('image', 'IMMUTABLE', { src: imageUrl });

        this.setEditorState(AtomicBlockUtils.insertAtomicBlock(
          newEditorState,
          entityKey,
          ' '
        ));
      } else {
        const blockKey = genKey();
        const contentBlockMap = new OrderedMap([
          [blockKey, new ContentBlock({ key: blockKey, type: 'unstyled' })],
        ]);
        const currentBlockMap = editorState.getCurrentContent().getBlockMap();
        // mount block map with new block to insert before
        const blockMap = currentBlockMap.concat(
          contentBlockMap.toSeq(),
        ).toOrderedMap();

        const content = editorState.getCurrentContent().merge({ blockMap });
        const newEditorState = EditorState.push(editorState, content, 'split-block');

        const entityKey = Entity.create('image', 'IMMUTABLE', { src: imageUrl });
        this.setEditorState(AtomicBlockUtils.insertAtomicBlock(
          newEditorState,
          entityKey,
          ' '
        ));
      }

    } else {
      const entityKey = Entity.create('image', 'IMMUTABLE', { src: imageUrl });

      this.setEditorState(AtomicBlockUtils.insertAtomicBlock(
        editorState,
        entityKey,
        ' '
      ));
    }
  }

  toggleLink() {
    const { editorState } = this.state;
    const linkUrl = 'http://ourcities.org';

    const editorStateWithLink = Utils.toggleLink(editorState, { href: linkUrl });
    this.setEditorState(editorStateWithLink);
  }

  toggleAlignment(alignment) {
    this.setEditorState(Utils.toggleAlignment(this.state.editorState, alignment))
  }


  handleKeyCommand(command, chars) {
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
      const insertEditorState = EditorState.push(editorState, content, 'insert-new-line')
      let targetSelection = insertEditorState.getSelection().merge({
        anchorKey: contentBlock.getKey(),
        focusKey: contentBlock.getKey(),
        anchorOffset: 0,
        focusOffset: 0,
        isBackward: false
      })

      if (chars) {
        // insert chars input in new block
        const contentState = Modifier.insertText(insertEditorState.getCurrentContent(), targetSelection, chars)
        const newEditorState = EditorState.push(insertEditorState, contentState, 'insert-characteres')

        this.setEditorState(EditorState.forceSelection(newEditorState, targetSelection.merge({
          anchorOffset: chars.length,
          focusOffset: chars.length
        })))
      } else {
        this.setEditorState(EditorState.forceSelection(insertEditorState, targetSelection))
      }

      return true
    }
    return false
  }

  handleBeforeInput(chars) {
    const { editorState } = this.state
    const selection = editorState.getSelection()
    const block = editorState.getCurrentContent().getBlockForKey(selection.getStartKey())
    if (block.getType() === 'atomic') {
      this.handleKeyCommand('split-block', chars)
      return true
    }
    return false
  }

  blockStyleFn(block) {
    // TODO: Move to control and receive like plugin
    const { editorState } = this.state

    let alignment = getBlockAlignment(block)
    /*if (!block.getText()) {
      let previousBlock = editorState.getCurrentContent().getBlockBefore(block.getKey())
      if (previousBlock) {
        alignment = getBlockAlignment(previousBlock)
      }
    }*/
    return `alignment--${alignment}`
  }

  blockRendererFn(block) {
    if (block.getType() === 'atomic') {
      const entityKey = block.getEntityAt(0);
      const entity = entityKey ? Entity.get(entityKey) : undefined;

      if (entity && entity.getType() === 'image') {
        return {
          component: Image,
        };
      }
    }
  }


  render() {
    return (
      <div>
        <div>
          <button onClick={this.insertImage.bind(this)}>Insert Image</button>
          <button onClick={this.toggleLink.bind(this)}>Insert Link</button>
          <button onClick={() => this.toggleAlignment('left')}>Left</button>
          <button onClick={() => this.toggleAlignment('center')}>Center</button>
          <button onClick={() => this.toggleAlignment('right')}>Right</button>
        </div>
        <div style={{ height: 'auto', minHeight: '100px' }} onClick={() => this.refs.editor.focus()}>
          <Editor
            ref="editor"
            editorState={this.state.editorState}
            onChange={this.setEditorState.bind(this)}
            readOnly={this.state.readOnly}
            handleBeforeInput={this.handleBeforeInput.bind(this)}
            blockStyleFn={this.blockStyleFn.bind(this)}
            blockRendererFn={this.blockRendererFn.bind(this)}
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
