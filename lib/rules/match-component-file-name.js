/**
 * @fileoverview Require component name property to match its file name
 * @author Rodrigo Pedra Brum <rodrigo.pedra@gmail.com>
 */
'use strict'

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const utils = require('../utils')
const casing = require('../utils/casing')
const path = require('path')

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/**
 * @param {Expression | SpreadElement} node
 * @returns {node is (Literal | TemplateLiteral)}
 */
function canVerify(node) {
  return (
    node.type === 'Literal' ||
    (node.type === 'TemplateLiteral' &&
      node.expressions.length === 0 &&
      node.quasis.length === 1)
  )
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require component name property to match its file name',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/match-component-file-name.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          extensions: {
            type: 'array',
            items: {
              type: 'string'
            },
            uniqueItems: true,
            additionalItems: false
          },
          shouldMatchCase: {
            type: 'boolean'
          }
        },
        additionalProperties: false
      }
    ]
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = context.options[0]
    const shouldMatchCase = (options && options.shouldMatchCase) || false
    const extensionsArray = options && options.extensions
    const allowedExtensions = Array.isArray(extensionsArray)
      ? extensionsArray
      : ['jsx']

    const extension = path.extname(context.getFilename())
    const filename = path.basename(context.getFilename(), extension)

    /** @type {Rule.ReportDescriptor[]} */
    const errors = []
    let componentCount = 0

    if (!allowedExtensions.includes(extension.replace(/^\./, ''))) {
      return {}
    }

    // ----------------------------------------------------------------------
    // Private
    // ----------------------------------------------------------------------

    /**
     * @param {string} name
     * @param {string} filename
     */
    function compareNames(name, filename) {
      if (shouldMatchCase) {
        return name === filename
      }

      return (
        casing.pascalCase(name) === filename ||
        casing.kebabCase(name) === filename
      )
    }

    /**
     * @param {Literal | TemplateLiteral} node
     */
    function verifyName(node) {
      let name
      if (node.type === 'TemplateLiteral') {
        const quasis = node.quasis[0]
        name = quasis.value.cooked
      } else {
        name = `${node.value}`
      }

      if (!compareNames(name, filename)) {
        errors.push({
          node,
          message:
            'Component name `{{name}}` should match file name `{{filename}}`.',
          data: { filename, name }
        })
      }
    }

    return Object.assign(
      {},
      utils.executeOnCallVueComponent(context, (node) => {
        if (node.arguments.length === 2) {
          const argument = node.arguments[0]

          if (canVerify(argument)) {
            verifyName(argument)
          }
        }
      }),
      utils.executeOnVue(context, (object) => {
        const node = utils.findProperty(object, 'name')

        componentCount++

        if (!node) return
        if (!canVerify(node.value)) return
        verifyName(node.value)
      }),
      {
        'Program:exit'() {
          if (componentCount > 1) return

          for (const error of errors) context.report(error)
        }
      }
    )
  }
}
