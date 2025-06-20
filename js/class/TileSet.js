export class TileSet {
    constructor(url, width, height, tileSize, rows, columns) {
      this.image = new Image(width, height);
      this.image.src = url;
  
      this.width = width;
      this.height = height;
      this.tileSize = tileSize;
      this.rows = rows;
      this.columns = columns;
    }

    getTileIndex(x, y) {
      return (y * this.columns) + x;
    }
  
    getTileCoordinates(tileIndex) {
      const column = tileIndex % this.columns;
      const row = Math.floor(tileIndex / this.columns);
      return { column, row };
    }
  
    drawTileOnCanvas(context, x, y, tileIndex) {
      const tileCoordinates = this.getTileCoordinates(tileIndex);
      const xInTileset = tileCoordinates.column * this.tileSize;
      const yInTileset = tileCoordinates.row * this.tileSize;
  
      context.drawImage(
        this.image,    // The tileset image containing the tile
        xInTileset,    // The x coordinate of the tile in the tileset image
        yInTileset,    // The y coordinate of the tile in the tileset image
        this.tileSize, // The width of the tile in the tileset image
        this.tileSize, // The height of the tile in the tileset image
        x,             // The x coordinate of the tile on the canvas
        y,             // The y coordinate of the tile on the canvas
        this.tileSize, // The width of the tile on the canvas
        this.tileSize, // The height of the tile on the canvas
      );
    }
  }
  