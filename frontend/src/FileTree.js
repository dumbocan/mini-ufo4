import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FaFolder, FaFile, FaPlay, FaTrash } from 'react-icons/fa';

const FileTree = ({ tree, onFileClick, onFolderClick, onPlayClick, onDeleteClick }) => {
  return (
    <ul className="list-unstyled file-tree-list">
      {tree.map((item) => (
        <li key={item.id || item.name} className="file-tree-item">
          <div className="d-flex align-items-center justify-content-between">
            <span
              className={`d-flex align-items-center ${item.type === 'directory' ? 'folder-name' : 'file-name'}`}
              onClick={() => item.type === 'directory' ? onFolderClick(item) : onFileClick(item)}
            >
              {item.type === 'directory' ? <FaFolder className="me-1" /> : <FaFile className="me-1" />}
              {item.name}
            </span>
            <div className="file-actions">
              {item.type === 'directory' && (
                <Button variant="link" size="sm" onClick={() => onPlayClick(item)} className="text-success p-0 me-1">
                  <FaPlay />
                </Button>
              )}
              {item.type === 'file' && item.name.endsWith('.py') && (
                <Button variant="link" size="sm" onClick={() => onPlayClick(item)} className="text-success p-0 me-1">
                  <FaPlay />
                </Button>
              )}
              <Button variant="link" size="sm" onClick={() => onDeleteClick(item)} className="text-danger p-0">
                <FaTrash />
              </Button>
            </div>
          </div>
          {item.children && item.children.length > 0 && (
            <div className="file-tree-children ps-3">
              <FileTree
                tree={item.children}
                onFileClick={onFileClick}
                onFolderClick={onFolderClick}
                onPlayClick={onPlayClick}
                onDeleteClick={onDeleteClick}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
};

export default FileTree;
