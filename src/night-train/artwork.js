import {drawWeatherSky} from './weather-sky.js';
import {trainPosition} from './world-visuals.js';
/** Painted scene layers and the independent animations over them. */
export function createArtworkRenderer(context, onReady) {
  const images = {};
  for (const [name, filename] of Object.entries({
    landscape: "seasons.png",
    daylight: "seasons-day.png",
    train: "train.png",
    events: "events.png",
    holidays: "holidays.png",
  })) {
    const image = new Image();
    image.onload = () => {
      images[name] = image;
      onReady();
    };
    image.src = window.NACHTBAHN_ASSETS?.[filename.replace(".png", "")] || "./assets/" + filename;
  }

  const random = (seed) => {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  };

  function glow(x, y, radius, color) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "transparent");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function dot(x, y, radius, color) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
  }

  function drawEvent(index, x, y, size) {
    const image = images.events;
    if (!image) return;
    const cellWidth = image.width / 3;
    const cellHeight = image.height / 2;
    const height = (size * cellHeight) / cellWidth;
    context.drawImage(
      image,
      (index % 3) * cellWidth,
      Math.floor(index / 3) * cellHeight,
      cellWidth,
      cellHeight,
      x,
      y - height,
      size,
      height,
    );
  }

  function holidaySprite(occasion, time) {
    const image = images.holidays;
    if (!image) return;
    const rabbitWidth = image.width * 0.325;
    const sleighWidth = image.width - rabbitWidth;
    if (occasion === "easter") {
      const size = 205;
      const height = (size * image.height) / rabbitWidth;
      context.drawImage(
        image,
        0,
        0,
        rabbitWidth,
        image.height,
        1355,
        835 - height + Math.sin(time * 1.5) * 2,
        size,
        height,
      );
    }
    if (occasion === "christmas_eve") {
      const width = 620,
        height = (width * image.height) / sleighWidth;
      const x = ((time * 35 + 850) % 2300) - 650;
      context.drawImage(
        image,
        rabbitWidth,
        0,
        sleighWidth,
        image.height,
        x,
        -30 + Math.sin(time) * 9,
        width,
        height,
      );
      for (let spark = 0; spark < 12; spark++) {
        glow(x - spark * 13, 250 + Math.sin(spark + time) * 10, 5, "#ffdf9760");
      }
    }
  }

  function holidayDecorations(occasion, time) {
    if (["christmas", "christmas_eve", "nicholas"].includes(occasion)) {
      drawEvent(5, 1290, 765, 245);
      for (let index = 0; index < 25; index++) {
        const x = 1090 + index * 17;
        const y = 520 + Math.sin((index / 24) * Math.PI) * 25;
        dot(x, y, 2.3, index % 3 ? "#ffd98c" : "#ee8471");
        glow(x, y, 12, "#ffbd4733");
      }
    }
    if (occasion === "easter") {
      for (let index = 0; index < 8; index++) {
        context.save();
        context.translate(1100 + index * 51, 770 - Math.sin(index) * 7);
        context.rotate(Math.sin(index) * 0.25);
        const gradient = context.createLinearGradient(-12, -30, 14, 0);
        gradient.addColorStop(0, ["#f6c6c0", "#d0dcb7", "#c0d3ef"][index % 3]);
        gradient.addColorStop(1, ["#bc7e91", "#739f82", "#818eb5"][index % 3]);
        context.fillStyle = gradient;
        context.beginPath();
        context.ellipse(0, -15, 13, 20, 0, 0, Math.PI * 2);
        context.fill();
        for (let spot = 0; spot < 3; spot++)
          dot(-6 + spot * 6, -15, 2, "#fff3d7");
        context.restore();
      }
    }
    if (occasion === "halloween") {
      for (let index = 0; index < 5; index++) {
        const x = 1120 + index * 78;
        const y = 742 + Math.sin(index) * 8;
        glow(x, y, 50, "#ff941c22");
        const gradient = context.createRadialGradient(
          x - 8,
          y - 12,
          2,
          x,
          y,
          30,
        );
        gradient.addColorStop(0, "#ebac5c");
        gradient.addColorStop(1, "#975029");
        context.fillStyle = gradient;
        context.beginPath();
        context.ellipse(x, y, 27, 23, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#f9dc87";
        for (const offset of [-10, 9]) {
          context.beginPath();
          context.moveTo(x + offset, y - 11);
          context.lineTo(x + offset - 5, y - 1);
          context.lineTo(x + offset + 5, y - 1);
          context.fill();
        }
        context.fillRect(x - 9, y + 8, 19, 4);
        context.fillStyle = "#596342";
        context.fillRect(x - 3, y - 30, 6, 10);
      }
      for (let index = 0; index < 6; index++) {
        const x = ((time * 42 + index * 285) % 1800) - 100;
        const y = 280 + Math.sin(time * 2 + index) * 26;
        context.strokeStyle = "#070e18";
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(x - 17, y - 8 - Math.sin(time * 8) * 9);
        context.quadraticCurveTo(x - 8, y - 5, x, y + 3);
        context.quadraticCurveTo(
          x + 8,
          y - 5,
          x + 17,
          y - 8 - Math.sin(time * 8) * 9,
        );
        context.stroke();
      }
    }
    if (["may", "mothers", "fathers", "birthday"].includes(occasion)) {
      context.strokeStyle = "#b5a083";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(1040, 520);
      context.quadraticCurveTo(1275, 620, 1510, 520);
      context.stroke();
      for (let index = 0; index < 15; index++) {
        const x = 1055 + index * 31;
        const y = 523 + Math.sin((index / 14) * Math.PI) * 46;
        context.fillStyle = ["#db9e89", "#a4c4ae", "#e7c282"][index % 3];
        context.beginPath();
        context.moveTo(x - 11, y);
        context.lineTo(x + 11, y);
        context.lineTo(x + Math.sin(time * 2 + index) * 3, y + 27);
        context.fill();
      }
    }
    if (occasion === "newyear" || occasion === "birthday") {
      for (let burst = 0; burst < 3; burst++) {
        const phase = (time * 0.19 + burst * 0.32) % 1;
        const x = 380 + burst * 415;
        const y = 180 + (burst % 2) * 70;
        for (let ray = 0; ray < 40; ray++) {
          const angle = (ray * Math.PI * 2) / 40;
          const px = x + Math.cos(angle) * phase * 130;
          const py = y + Math.sin(angle) * phase * 105 + phase * phase * 38;
          dot(
            px,
            py,
            2.2,
            `rgba(248,${175 + burst * 24},${110 + burst * 43},${1 - phase})`,
          );
        }
      }
    }
  }

  function draw({
    season,
    occasion,
    light,
    weather,
    time,
    activeEvent,
    photoMode,
    platformScene,
  }) {
    if (!images.landscape || !images.train) return false;
    context.clearRect(0, 0, 1600, 900);
    if (photoMode) {
      if (activeEvent) {
        const index = {
          laundry: 0,
          dishes: 1,
          waste: 2,
          charging: 3,
          visitor: 4,
        }[activeEvent];
        drawEvent(index, 1140, 865, 390);
      }
      return true;
    }

    const index = ["spring", "summer", "autumn", "winter"].indexOf(season);
    const image = light!=="night"&&images.daylight?images.daylight:images.landscape;
    const panelWidth = image.width / 2;
    const panelHeight = image.height / 2;
    // Gentle camera drift across a painted world, with independent foreground movement.
    const drift = Math.sin(time * 0.035) * 13;
    context.drawImage(
      image,
      (index % 2) * panelWidth,
      Math.floor(index / 2) * panelHeight,
      panelWidth,
      panelHeight,
      -24 + drift,
      -12,
      1648,
      924,
    );
    drawWeatherSky(context,weather,time,light==="night");
    if (light !== "night") {
      context.save();
      context.globalCompositeOperation = "soft-light";
      context.fillStyle = light === "morning" ? "#f4cf8c66" : "#ca8c8d44";
      context.fillRect(0, 0, 1600, 900);
      context.restore();
    }
    holidayDecorations(occasion, time);
    holidaySprite(occasion, time);

    platformScene?.();

    if(!platformScene){
    // An entire illustrated train moves as one layer. Its steam rises independently.
    const trainWidth = 1140;
    const trainHeight = (trainWidth * images.train.height) / images.train.width;
    const trainX = trainPosition(time);
    const trainBottom = 804 + Math.sin(time * 3) * 1.3;
    context.save();
    context.shadowColor = "#0009";
    context.shadowBlur = 16;
    context.shadowOffsetY = 8;
    context.drawImage(
      images.train,
      trainX,
      trainBottom - trainHeight,
      trainWidth,
      trainHeight,
    );
    context.restore();
    const chimneyX = trainX + trainWidth * 0.88;
    const chimneyY = trainBottom - trainHeight * 0.84;
    for (let particle = 0; particle < 22; particle++) {
      const age = (time * 0.16 + particle / 22) % 1;
      const x = chimneyX - age * 310 + Math.sin(particle * 3 + time) * 8;
      const y = chimneyY - age * 170;
      const radius = 6 + age * 25;
      glow(x, y, radius, `rgba(191,210,222,${(1 - age) * 0.3})`);
    }
    glow(trainX + trainWidth * 0.95, trainBottom - 90, 120, "#ffd39218");
    if (["christmas", "nicholas"].includes(occasion)) {
      for (let bulb = 0; bulb < 37; bulb++) {
        const x = trainX + 70 + bulb * 20;
        const y = trainBottom - trainHeight * 0.61 + Math.sin(bulb / 6) * 7;
        dot(x, y, 2, bulb % 3 ? "#ffd79a" : "#db8d7c");
      }
    }
    }
    if (activeEvent) {
      const eventIndex = {
        laundry: 0,
        dishes: 1,
        waste: 2,
        charging: 3,
        visitor: 4,
      }[activeEvent];
      // Large illustrated foreground vignettes remain legible on a wall display.
      glow(1330, 755, 180, "#ffd28d15");
      drawEvent(eventIndex, 1140, 865 + Math.sin(time * 1.2) * 1.5, 390);
    }
    if (weather === "snow" || weather === "rain") {
      for (let particle = 0; particle < 125; particle++) {
        const speed = weather === "rain" ? 430 : 24;
        const x =
          (((random(particle) * 1700 - time * (weather === "rain" ? 60 : 12)) %
            1700) +
            1700) %
          1700;
        const y =
          (random(particle + 911) * 950 +
            time * speed * (random(particle) + 0.3)) %
          950;
        if (weather === "rain") {
          context.strokeStyle = "#c2d5e647";
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x - 5, y + 18);
          context.stroke();
        } else dot(x, y, 1 + random(particle) * 2, "#e2eaf099");
      }
    }
    if (season === "summer") {
      for (let fly = 0; fly < 26; fly++) {
        const x = random(fly) * 1600 + Math.sin(time + fly) * 15;
        const y = 510 + random(fly + 53) * 260 + Math.cos(time * 0.8 + fly) * 9;
        glow(x, y, 13, "#d7db7333");
        dot(
          x,
          y,
          1.6,
          `rgba(235,231,155,${0.45 + Math.sin(time + fly) * 0.3})`,
        );
      }
    }
    if (season === "autumn") {
      for (let leaf = 0; leaf < 20; leaf++) {
        const x = (((random(leaf) * 1700 - time * 27) % 1700) + 1700) % 1700;
        const y = (random(leaf + 32) * 950 + time * 18) % 950;
        context.save();
        context.translate(x, y);
        context.rotate(time + leaf);
        context.fillStyle = "#c78d4799";
        context.beginPath();
        context.ellipse(0, 0, 6, 2.5, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }
    const shade = context.createLinearGradient(0, 0, 0, 420);
    shade.addColorStop(0, "#01071380");
    shade.addColorStop(1, "transparent");
    context.fillStyle = shade;
    context.fillRect(0, 0, 1600, 420);
    return true;
  }
  return { draw };
}
