import React, { Component } from 'react';
import { Entity } from 'draft-js';


class Image extends Component {

  getEntityData() {
    const { block } = this.props;
    const entityKey = block.getEntityAt(0);
    return { entityKey, data: Entity.get(entityKey).getData() };
  }

  render() {
    const { data: { href, target, ...imageProps } } = this.getEntityData();
    const image = <img role="presentation" {...imageProps} />;

    if (href) {
      return <a href={href} target={target}>{image}</a>;
    }

    return image;
  }
}

export default Image;

