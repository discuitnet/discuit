import { Comment } from '../serverTypes';

/*
const node = {
  parent: null,
  noRepliesRendered: 0,
  comment: {},
  children: [], // array of nodes
}
// root is just a node
*/

export class Node {
  parent: Node | null;
  noRepliesRendered: number;
  collapsed: boolean;
  comment: Comment | null; // Only null for the root node.
  children: Node[] | null;
  constructor(comment: Comment | null, children: Node[] | null, parent: Node | null = null) {
    this.parent = parent;
    this.noRepliesRendered = 0;
    this.collapsed = false;
    this.comment = comment;
    this.children = children;
  }
}

export function searchTree(root: Node, commentId: string, commentDepth?: number): Node | null {
  if (root.comment && root.comment.id === commentId) return root;
  if (!root.children || root.children.length === 0) return null;
  if (commentDepth !== undefined && root.children[0].comment!.depth > commentDepth) return null;
  for (let i = 0; i < root.children.length; i++) {
    const node = root.children[i];
    if (node.comment!.id === commentId) {
      return node;
    } else if (node.children) {
      const hit = searchTree(node, commentId, commentDepth);
      if (hit) return hit;
    }
  }
  return null;
}

function pushComment(node: Node, comment: Comment, pushToFront: boolean = false): Node {
  const newNode = new Node(comment, null, node);
  if (!node.children) node.children = [];
  if (pushToFront) {
    node.children.unshift(newNode);
  } else {
    node.children.push(newNode);
  }
  return newNode;
}

export function commentsTree(comments: Comment[] = [], root?: Node): Node {
  if (root === undefined) root = new Node(null, null);
  if (comments === null || comments === undefined) return root;
  const partials: Node[] = []; // array of roots
  for (let i = 0; i < comments.length; i++) {
    const parentId = comments[i].parentId;
    if (parentId === null) {
      pushComment(root, comments[i]);
    } else {
      let hit = searchTree(root, parentId, comments[i].depth);
      if (!hit) {
        for (let j = 0; j < partials.length; j++) {
          hit = searchTree(partials[j], parentId, comments[i].depth);
          if (hit) break;
        }
      }
      if (hit) {
        pushComment(hit, comments[i]);
      } else {
        partials.push(new Node(comments[i], null));
      }
    }
  }
  const merged = mergeTrees(root, partials);
  updateNoRendered(merged);
  return merged;
}

function updateNoRendered(root: Node) {
  if (!root.children) return 0;
  let no = root.children.length;
  for (let i = 0; i < root.children.length; i++) {
    no += updateNoRendered(root.children[i]);
  }
  root.noRepliesRendered = no;
  return no;
}

function mergeTrees(root: Node, partials: Node[] = []) {
  const all = [root, ...partials];
  for (let i = 0; i < partials.length; i++) {
    const { parentId, depth } = partials[i].comment!;
    for (let j = 0; j < all.length; j++) {
      if (all[j] === undefined) continue;
      const hit = searchTree(all[j], parentId!, depth);
      if (hit) {
        if (!hit.children) hit.children = [];
        partials[i].parent = hit;
        hit.children.push({ ...partials[i] });
        delete partials[i];
        break;
      }
    }
  }
  // check
  partials.forEach((p) => {
    if (p !== undefined) console.error('Comments tree: orphaned node');
  });
  return root;
}

function updateNoReplies(node: Node) {
  let parent = node.parent;
  while (parent) {
    if (parent.comment) parent.comment.noReplies++; // could be root
    parent.noRepliesRendered++;
    parent = parent.parent;
  }
  return node;
}

export function addComment(root: Node, comment: Comment) {
  let node;
  if (comment.parentId === null) {
    node = pushComment(root, comment, true);
  } else {
    const hit = searchTree(root, comment.parentId, comment.depth);
    if (hit === null) {
      throw new Error(`Parent comment not found (commentId:${comment.id})`);
    }
    node = pushComment(hit, comment, true);
  }
  updateNoReplies(node);
  updateNoRendered(root);
  return node;
}

export function updateComment(root: Node, comment: Comment) {
  const hit = searchTree(root, comment.id, comment.depth);
  if (hit === null) {
    throw new Error(`Comment not found (commentId:${comment.id})`);
  }
  hit.comment = {
    ...hit.comment,
    ...comment,
  };
  return hit;
}

export function countChildrenReplies(node: Node) {
  let n = 0;
  if (node.children) {
    n = node.children.length;
    for (let i = 0; i < node.children.length; i++) {
      n += node.children[i].comment!.noReplies;
    }
  }
  return n;
}
