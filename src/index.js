/* eslint-disable no-eval */
const os = require('os');

const startBlockRegex = /[<!--|\/\/] #if ([\s\S]*?)(-->)?$/;
const endBlockRegex = /[<!--|\/\/] #endif/;

function isHtml (line) {
  return /<!--.*-->/.test(line);
}

function getPredicate (line) {
  return startBlockRegex.exec(line)[1]
}

function searchBlocks (sourceByLine) {
  const blocks = []
  let current = 0

  while (current < sourceByLine.length) {
    const currentLine = sourceByLine[current];

    if (startBlockRegex.test(currentLine)) {
      blocks[current] = {
        type: 'begin',
        predicate: getPredicate(currentLine),
        isHtml: isHtml(currentLine)
      }

      current += 1
      continue
    }

    if (endBlockRegex.test(currentLine)) {
      blocks[current] = {
        type: 'end'
      }

      current += 1
      continue
    }

    current += 1
  }

  return blocks
}

function getTruthyBlocks (blocks) {
  const truthyBlocks = blocks.slice()
  let i = 0
  let action = ''

  while (i < truthyBlocks.length) {
    if (truthyBlocks[i] && truthyBlocks[i].type === 'begin') {
      if (eval(truthyBlocks[i].predicate)) {
        truthyBlocks[i] = undefined
        action = 'deleteNextEndBlock'
      }
    }

    if (truthyBlocks[i] && truthyBlocks[i].type === 'end' && action === 'deleteNextEndBlock') {
      truthyBlocks[i] = undefined
      action = ''
    }

    i += 1
  }

  return truthyBlocks
}

function commentCodeInsideBlocks (sourceByLine, blocks) {
  let currentBlock
  let i = 0
  let action = ''
  let sourceByLineTransformed = sourceByLine.slice()
  let isHtml;

  while (i < sourceByLine.length) {
    currentBlock = blocks[i]

    if (currentBlock && currentBlock.type === 'begin') {
      action = 'commentLine'
      isHtml = currentBlock.isHtml;
      i += 1
      continue
    }

    if (currentBlock && currentBlock.type === 'end') {
      action = ''
      i += 1
      continue
    }

    if (action === 'commentLine') {
      sourceByLineTransformed[i] = commentLine(sourceByLine[i], isHtml)
    }

    i += 1
  }

  return sourceByLineTransformed
}

function commentLine (line, isHtml) {
  return isHtml ? `<!-- ${line} -->` : `// ${line}`
}

module.exports = function (source) {
  try {
    const sourceByLine = source.split(os.EOL)
    const blocks = searchBlocks(sourceByLine)
    const truthyBlocks = getTruthyBlocks(blocks)
    const transformedSource = commentCodeInsideBlocks(sourceByLine, truthyBlocks)

    return transformedSource.join('\n')
  } catch (error) {
    console.error(error)
    throw error
  }
}
