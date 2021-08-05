import styled, { createGlobalStyle } from 'styled-components';

const black = '#4d4d4d';
const blue = '#2d7cc2';

export const GlobalStyle = createGlobalStyle`

  html, body, div, span, applet, object, iframe,
  h1, h2, h3, h4, h5, h6, p, blockquote, pre,
  a, abbr, acronym, address, big, cite, code,
  del, dfn, em, img, ins, kbd, q, s, samp,
  small, strike, strong, sub, sup, tt, var,
  b, u, i, center,
  dl, dt, dd, ol, ul, li,
  fieldset, form, label, legend,
  table, caption, tbody, tfoot, thead, tr, th, td,
  article, aside, canvas, details, embed,
  figure, figcaption, footer, header, hgroup,
  menu, nav, output, ruby, section, summary,
  time, mark, audio, video {
    margin: 0;
    padding: 0;
    border: 0;
    font-size: 100%;
    font: inherit;
    vertical-align: baseline;
  }
  /* HTML5 display-role reset for older browsers */
  article, aside, details, figcaption, figure,
  footer, header, hgroup, menu, nav, section {
    display: block;
  }
  html {
  box-sizing: border-box;
  }
  *, *:before, *:after {
    box-sizing: inherit;
  }
  ol, ul {
    list-style: none;
  }
  blockquote, q {
    quotes: none;
  }
  blockquote:before, blockquote:after,
  q:before, q:after {
    content: '';
    content: none;
  }
  table {
    border-collapse: collapse;
    border-spacing: 0;
  }
  body {
    font-family: Roboto;
    line-height: 1;
    background-color: ${({ theme }) => theme.colors.bg};
  }

  a{
    text-decoration:none;
  }
  textarea, input, button {
    outline: none;
  }
  html{
    text-rendering: optimizeLegibility;
    color: ${black};
  }
  
  body, html, #popup {
    height: 100%;
  }
`;
