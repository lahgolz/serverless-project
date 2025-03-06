const gm = require("gm");

module.exports = ({ topText, bottomText, imageUrl }) => {
  return new Promise((resolve, reject) => {
    const image = gm(imageUrl);

    image.size((error, dimensions) => {
      if (error) {
        return reject(error);
      }

      const FONT_SIZE = 50;
      const LINE_SPACING = 8;

      const topTextLinesCount = topText.split("\n").length;
      const topTextPosition =
        Math.abs(
          dimensions.height / 2 -
            (FONT_SIZE + LINE_SPACING) * (topTextLinesCount / 2)
        ) * -1;

      const bottomTextLinesCount = bottomText.split("\n").length;
      const bottomTextPosition =
        dimensions.height / 2 -
        (FONT_SIZE + LINE_SPACING) * (bottomTextLinesCount / 2);

      image
        .font(`${__dirname}/impact.ttf`, FONT_SIZE)
        .fill("#FFF")
        .stroke("#000", 2)
        .drawText(0, topTextPosition, topText.toUpperCase(), "center")
        .drawText(0, bottomTextPosition, bottomText.toUpperCase(), "center")
        .toBuffer("PNG", (error, buffer) => {
          if (error) {
            return reject(error);
          }

          resolve(buffer);
        });
    });
  });
};
