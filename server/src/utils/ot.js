/**
 * Operational Transformation (OT) Engine
 * Handles concurrent edits in collaborative editing
 * Supports insert, delete, and retain operations
 */

class OperationalTransform {
  /**
   * Apply an operation to a document string
   * Operation format: array of ops { type: 'retain'|'insert'|'delete', count?, text? }
   */
  static apply(content, operation) {
    if (!operation || !Array.isArray(operation)) return content;

    let result = '';
    let index = 0;

    for (const op of operation) {
      if (op.type === 'retain') {
        result += content.slice(index, index + op.count);
        index += op.count;
      } else if (op.type === 'insert') {
        result += op.text;
      } else if (op.type === 'delete') {
        index += op.count;
      }
    }

    // Append remaining content
    result += content.slice(index);
    return result;
  }

  /**
   * Transform operation A against concurrent operation B
   * Returns A' such that apply(apply(doc, B), A') === apply(apply(doc, A), B')
   */
  static transform(opA, opB) {
    if (!opA || !opB) return opA;

    const result = [];
    let i = 0; // index in opA
    let j = 0; // index in opB
    let remainA = opA[i] ? { ...opA[i] } : null;
    let remainB = opB[j] ? { ...opB[j] } : null;

    while (remainA) {
      if (!remainB) {
        result.push(remainA);
        i++;
        remainA = opA[i] ? { ...opA[i] } : null;
        continue;
      }

      if (remainA.type === 'insert') {
        result.push(remainA);
        i++;
        remainA = opA[i] ? { ...opA[i] } : null;
        continue;
      }

      if (remainB.type === 'insert') {
        result.push({ type: 'retain', count: remainB.text.length });
        j++;
        remainB = opB[j] ? { ...opB[j] } : null;
        continue;
      }

      const lenA = remainA.count || 0;
      const lenB = remainB.count || 0;
      const minLen = Math.min(lenA, lenB);

      if (remainA.type === 'retain' && remainB.type === 'retain') {
        result.push({ type: 'retain', count: minLen });
      } else if (remainA.type === 'retain' && remainB.type === 'delete') {
        // A retains, B deletes — skip (the chars are gone)
      } else if (remainA.type === 'delete' && remainB.type === 'retain') {
        result.push({ type: 'delete', count: minLen });
      } else if (remainA.type === 'delete' && remainB.type === 'delete') {
        // Both delete same range — no-op
      }

      if (lenA < lenB) {
        remainB.count -= lenA;
        i++;
        remainA = opA[i] ? { ...opA[i] } : null;
      } else if (lenA > lenB) {
        remainA.count -= lenB;
        j++;
        remainB = opB[j] ? { ...opB[j] } : null;
      } else {
        i++;
        j++;
        remainA = opA[i] ? { ...opA[i] } : null;
        remainB = opB[j] ? { ...opB[j] } : null;
      }
    }

    return result;
  }

  /**
   * Compose two sequential operations into one
   */
  static compose(op1, op2) {
    // Simplified compose — for production use a full OT library like ot.js or ShareDB
    return op2;
  }

  /**
   * Create an insert operation at position
   */
  static insert(position, text, docLength) {
    const ops = [];
    if (position > 0) ops.push({ type: 'retain', count: position });
    ops.push({ type: 'insert', text });
    const remaining = docLength - position;
    if (remaining > 0) ops.push({ type: 'retain', count: remaining });
    return ops;
  }

  /**
   * Create a delete operation
   */
  static delete(position, count, docLength) {
    const ops = [];
    if (position > 0) ops.push({ type: 'retain', count: position });
    ops.push({ type: 'delete', count });
    const remaining = docLength - position - count;
    if (remaining > 0) ops.push({ type: 'retain', count: remaining });
    return ops;
  }

  /**
   * Replace operation (delete + insert)
   */
  static replace(position, deleteCount, insertText, docLength) {
    const ops = [];
    if (position > 0) ops.push({ type: 'retain', count: position });
    if (deleteCount > 0) ops.push({ type: 'delete', count: deleteCount });
    if (insertText) ops.push({ type: 'insert', text: insertText });
    const remaining = docLength - position - deleteCount;
    if (remaining > 0) ops.push({ type: 'retain', count: remaining });
    return ops;
  }
}

module.exports = { OperationalTransform };
