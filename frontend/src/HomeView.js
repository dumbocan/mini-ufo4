import React from 'react';
import { Container, Row, Col, Form, Button, Spinner } from 'react-bootstrap';

function HomeView({
  prompt,
  setPrompt,
  handleGenerate,
  isLoading,
  projects,
  handleLoadProject,
  handleDeleteProject
}) {
  return (
    <Container>
      <Row className="justify-content-center">
        <Col md={8}>
          <div className="text-center mb-4">
            <h1>Mini-UFO 4</h1>
            <p className="text-muted">Your AI programming assistant</p>
          </div>
          <Form.Group controlId="prompt-textarea">
            <Form.Control
              as="textarea"
              rows={6}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Plot the first 100 fibonacci numbers'"
              disabled={isLoading}
              style={{
                backgroundColor: 'var(--input-bg-color)',
                color: 'var(--input-text-color)',
                borderColor: 'var(--border-color)'
              }}
            />
          </Form.Group>
          <div className="d-flex justify-content-center mt-3">
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                  {' Generating...'}
                </>
              ) : (
                'Generate'
              )}
            </Button>
          </div>
        </Col>
      </Row>
      <Row className="justify-content-center mt-5">
        <Col md={8}>
          <h5>Recent Projects</h5>
          {projects.length === 0 ? (
            <p className="text-muted">No saved projects yet.</p>
          ) : (
            <ul className="list-unstyled">
              {projects.map(p => (
                <li key={p.id} className="d-flex justify-content-between align-items-center mb-2">
                  <span>{p.name} ({new Date(p.created_at).toLocaleString()})</span>
                  <div>
                    <Button size="sm" variant="secondary" className="me-2" onClick={() => handleLoadProject(p)}>Open</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDeleteProject({ id: p.id, type: 'dir', name: p.name })}>Delete</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default HomeView;
