import React, { Component } from 'react';
import { Entity } from 'draft-js';


class Link extends Component {

  render() {
    const { children, entityKey } = this.props;

    const entity = Entity.get(entityKey);
    const { href, url, ...restProps } = entity.getData();

    return (
      <a href={href|url} {...restProps}>
        {children}
      </a>
    );
  }
}

export const findLinkEntities = (contentBlock, callback) => {
  contentBlock.findEntityRanges(
    (character) => {
      const entityKey = character.getEntity();
      const entity = entityKey ? Entity.get(entityKey) : null;

      return (
        entity !== null &&
        entity.getType() === 'LINK'
      );
    },
    callback
  );
}

export default Link;
