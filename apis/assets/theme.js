/* After making changes remember to copy the rules below to the private build. */

const eggplant = "#2e143d";
const eggplantLighten10 = "#4b2164";
const purple = "#785cba";
const greenDarken10 = "#337554";
const greenLighten50 = "#e7f3ed";
const orangeDarken10 = "#bf371f";
const orangeLighten40 = "#fae7e3";
const yellowDarken40 = "#63480c";
const yellowLighten30 = "#f9f0db";
const blue = "#276cf5";
const goldLighten20 = "#f6c877";

const theme = {
  hideDownloadButton: true,
  theme: {
    colors: {
      http: {
        get: blue,
        post: greenDarken10,
        put: goldLighten20,
        delete: orangeDarken10,
      },
      primary: {
        main: eggplantLighten10
      },
      responses: {
        success: {
          color: greenDarken10,
          backgroundColor: greenLighten50,
        },
        error: {
          color: orangeDarken10,
          backgroundColor: orangeLighten40,
        },
        redirect: {
          color: yellowDarken40,
          backgroundColor: yellowLighten30,
        },
      },
    },
    menu: {
      backgroundColor: '#ffffff' // Blend with logo
    },
    rightPanel: {
      backgroundColor: eggplant
    },
    breakpoints: {
      small: '50rem',
      medium: '70rem',
      large: '105rem',
    },
    typography: {
      links: {
        color: purple,
        visited: purple,
        hover: purple,
      }
    }
  },
};