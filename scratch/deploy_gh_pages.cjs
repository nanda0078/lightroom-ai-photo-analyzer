const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Deploying dist/ to gh-pages branch...');

// Make sure dist exists
if (!fs.existsSync('dist/index.html')) {
  throw new Error('dist/index.html not found! Run npm run build first.');
}

const tempIndex = path.resolve('.git', 'temp_gh_pages_index');
if (fs.existsSync(tempIndex)) {
  fs.unlinkSync(tempIndex);
}

// Function to run git command with custom environment
function git(cmd, extraEnv = {}) {
  return execSync(`git ${cmd}`, {
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv }
  }).trim();
}

try {
  // Add all files in dist to the temporary index
  git('add -f dist', { GIT_INDEX_FILE: tempIndex });

  // Write tree from dist subfolder
  // Git allows writing the subtree directly with write-tree --prefix=dist
  const treeSha = git('write-tree --prefix=dist', { GIT_INDEX_FILE: tempIndex });
  console.log('Tree SHA:', treeSha);

  // Get current gh-pages commit as parent
  let parentCommit = '';
  try {
    parentCommit = git('rev-parse refs/heads/gh-pages');
  } catch (e) {
    try {
      parentCommit = git('rev-parse origin/gh-pages');
    } catch (e2) {}
  }

  let commitCmd = `commit-tree ${treeSha} -m "deploy: update GitHub Pages with client-side BYOK and latest Release APK"`;
  if (parentCommit) {
    commitCmd += ` -p ${parentCommit}`;
  }

  const newCommitSha = git(commitCmd);
  console.log('New Commit SHA on gh-pages:', newCommitSha);

  // Update refs/heads/gh-pages
  git(`update-ref refs/heads/gh-pages ${newCommitSha}`);
  console.log('Updated refs/heads/gh-pages successfully.');

  // Push to origin gh-pages
  console.log('Pushing gh-pages to origin...');
  const pushRes = git('push origin gh-pages');
  console.log(pushRes);
  console.log('Deployment to gh-pages successful!');
} finally {
  if (fs.existsSync(tempIndex)) {
    fs.unlinkSync(tempIndex);
  }
}
