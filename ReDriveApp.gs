/*
  ReDriveApp (short for "Recommended" or "Replacement" DriveApp)
  https://github.com/googleworkspace/redriveapp

  Provides equivalent methods offered by the built-in DriveApp, but that only require use of 
  '/drive.file' Drive OAuth scope (a "Recommended" OAuth scope). Requires use of Apps Script
  Advanced Services (Drive) defined with identifier 'Drive' in your Apps Script manifest file.

  Created in light of the new Google OAuth changes that make full '/drive' scope a 'Restricted'
  scope, which has more requirements for public (non-internal) apps, such as a CASA security 
  review.
  
  Also replaces built-in, related Apps Script classes with equivalents:
    File             --> ReFile
    Folder           --> ReFolder
    User             --> ReUser
    FileIterator     --> ReFileIterator
    FolderIterator   --> ReFolderIterator
     
  Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except 
  in compliance with the License. You may obtain a copy of the License at
  http://www.apache.org/licenses/LICENSE-2.0
  
  Unless required by applicable law or agreed to in writing, software distributed under the License
  is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express 
  or implied. See the License for the specific language governing permissions and limitations under 
  the License.
*/

////////////////////////////////////////// ReDriveApp //////////////////////////////////////////////

// Global DriveApiVersion_ must be set to 2 or 3 via ReDriveApp.setApiVersion() before anything
// else can be used. 
//
// !! For now only v2 is supported and tested !!
DriveApiVersion_ = null;

// Static class methods for ReDriveApp
// noinspection JSUnusedGlobalSymbols, ThisExpressionReferencesGlobalObjectJS
this['ReDriveApp'] = {
  // Add local alias to run the library as normal code\
  setApiVersion: setApiVersion,
  createFile: createFile,
  getFileById: getFileById,
  getFolderById: getFolderById,
  createFolder: createFolder,
  getFoldersByName: getFoldersByName,
  getFilesByName: getFilesByName,
};

function setApiVersion(versionNumber) {
  if (versionNumber == 2 || versionNumber == 3) {
    DriveApiVersion_ = versionNumber;
    return;
  }

  throw new Error('ReDriveApp: Unsupported Drive API version: ' + versionNumber);
}

function checkDriveApiVersionIsSet_() {
  if (!DriveApiVersion_) {
    setApiVersion(2); //  use by default
  }
}

function getFileById(fileId) {
  checkDriveApiVersionIsSet_();

  var driveFilesResource = Drive.Files.get(fileId);

  return new ReFile_.Base({
    driveFilesResource: driveFilesResource, // 'Files' recourse from Drive API
  });
}

/* 
  Replicate 3 different calls to DriveApp.createFile():
    - DriveApp.createFile(blob) // 1 arg
    - DriveApp.createFile(name, content) // 2 args
    - DriveApp.createFile(name, content, mimeType) // 3 args
 */
CREATE_FILE_SIG_BLOB = 1;
CREATE_FILE_SIG_NC = 2;
CREATE_FILE_SIG_NCM = 3;

function createFile(a1, a2, a3) {
  checkDriveApiVersionIsSet_();

  var signature;
  var newFile;

  if (a1 === undefined) {
    throw new Error("Invalid number or arguments to createFile()")
  } else if (a2 === undefined && a3 === undefined) {
    signature = CREATE_FILE_SIG_BLOB;
  } else if (a2 !== undefined && a3 === undefined) {
    signature = CREATE_FILE_SIG_NC;
  } else {
    signature = CREATE_FILE_SIG_NCM;
  }

  if (signature === CREATE_FILE_SIG_BLOB) {
    newFile = createFileFromBlob_(a1);
  } else if (signature === CREATE_FILE_SIG_NC ) {
    newFile = createFileFromContentAndMimetype_(a1, a2, 'text/plain');
  } else if (signature === CREATE_FILE_SIG_NCM ) {
    newFile = createFileFromContentAndMimetype_(a1, a2, a3);
  }

  return newFile;  
}

function createFileFromBlob_(blob) {

  if (DriveApiVersion_ === 3) {
    throw new Error('createFile() not yet supported by ReDriveApp for Drive API v3')
  } else {
    var newFile = {
      title: blob.getName(),
      mimeType: blob.getContentType()
    };
    
    var driveFilesResource = Drive.Files.insert(newFile, blob); 
    
    return new ReFile_.Base({
      driveFilesResource: driveFilesResource, // 'Files' recourse from Drive API
    });
  }
}

function createFileFromContentAndMimetype_(name, content, mimeType) {
  if (DriveApiVersion_ === 3) {
    throw new Error('createFile() not yet supported by ReDriveApp for Drive API v3')
  } else {
    var mimeTypeStr = mimeType.toString(); // convert from Apps Script MimeType enum

    var newFile = {
      title: name,
      mimeType: mimeTypeStr
    };

    var blob = Utilities.newBlob(content, mimeType);

    var driveFilesResource = Drive.Files.insert(newFile, blob);

    return new ReFile_.Base({
      driveFilesResource: driveFilesResource, // 'Files' recourse from Drive API
    });
  }
}


function getFolderById(folderId) {
  checkDriveApiVersionIsSet_();

  var reFile = ReDriveApp.getFileById(folderId);

  return new ReFolder_.Base({
    reFile: reFile
  });
}

function getFilesorFoldersByName_(name, isFolders) {
  checkDriveApiVersionIsSet_();
  var queryString;

  name = name.replace(/'/g, "\\'");
  
  if (DriveApiVersion_ === 2) {
    queryString = "title = '" + name + "'";
  } else {
    queryString = "name = '" + name + "'";
  }

  if (isFolders) {
    queryString += " and mimeType = 'application/vnd.google-apps.folder'";
  } else {
    queryString += " and not mimeType = 'application/vnd.google-apps.folder'";
  }

  var options = {
    corpora: 'default',  // 'user' gives "Invalid Value" error
    //maxResults: 10, // for testing pagination
    q: queryString,
  };

  // Note: Due to only having drive.file scope, the following list() call will only
  // return files/folders that the app using this library was used to create or select.
  var results = Drive.Files.list(options);
  
  // console.log('results.items.length = ' + results.items.length)
  var nextPageToken;
  if (results.hasOwnProperty('nextPageToken') && results.nextPageToken) {
    nextPageToken = results.nextPageToken;
  } else {
    nextPageToken = null;
  }

  var files;

  if (DriveApiVersion_ === 2) {
    files = results.items;
  } else {
    files = results.files;
  }

  // console.log('files length: ' + files.length)
  var fi = new ReFileIterator_.Base({
    nextPageToken: nextPageToken,
    queryString: queryString,
    files: files,
    filesIndex: 0,
  });

  if (isFolders) {
    return new ReFolderIterator_.Base({
      fileIterator: fi
    });
  } else {
    return fi;
  }
  
}

function getFilesByName(name) {
  return getFilesorFoldersByName_(name, false);
}

function getFoldersByName(name) { 
  return getFilesorFoldersByName_(name, true);
}

function createFolder(name) {
  checkDriveApiVersionIsSet_();
  if (DriveApiVersion_ === 3) {
    throw new Error('createFolder() not yet supported by ReDriveApp for Drive API v3')
  } else {
    var mimeTypeStr = 'application/vnd.google-apps.folder';

    var newFolder = {
      title: name,
      mimeType: mimeTypeStr
    };

    var driveFilesResource = Drive.Files.insert(newFolder);

    return new ReFile_.Base({
      driveFilesResource: driveFilesResource, // 'Files' recourse from Drive API
    });
  }
}


////////////////////////////////////////// ReFile //////////////////////////////////////////////////
// Define ReFile class. This is an equivalent to the 'File' class returned by different DriveApp 
// methods (i.e. getFileById).
//
// See:
//   Apps Script: https://developers.google.com/apps-script/reference/drive/file
//   Drive API v2: https://developers.google.com/drive/api/v2/reference/files
//   Drive API v3: https://developers.google.com/drive/api/v3/reference/files


var ReFile_ = {};
ReFile_.Base = function (base) {
  this.base = base;
};

var reFileBaseClass_ = ReFile_.Base.prototype;

reFileBaseClass_.getName = function getName() {
  if (DriveApiVersion_ === 2) {
    return this.base.driveFilesResource.title;
  } else {
    return this.base.driveFilesResource.name;
  }
}

reFileBaseClass_.getDateCreated = function getDateCreated() {
  if (DriveApiVersion_ === 2) {
    return new Date(this.base.driveFilesResource.createdDate);
  } else {
    return new Date(this.base.driveFilesResource.createdTime);
  }
}


reFileBaseClass_.getLastUpdated = function getLastUpdated() {
  if (DriveApiVersion_ === 2) {
    return new Date(this.base.driveFilesResource.modifiedDate);
  } else {
    return new Date(this.base.driveFilesResource.modifiedTime);
  }
}

reFileBaseClass_.getSize = function getSize() {
  if (DriveApiVersion_ === 2) {
    return this.base.driveFilesResource.fileSize;
  } else {
    return this.base.driveFilesResource.size;
  }
}

reFileBaseClass_.getId = function getId() {
  return this.base.driveFilesResource.id;
}

reFileBaseClass_.getDescription = function getDescription() {
  return this.base.driveFilesResource.description;
}

reFileBaseClass_.getUrl = function getUrl() {
  if (DriveApiVersion_ === 2) {
    return this.base.driveFilesResource.alternateLink;
  } else {
    return this.base.driveFilesResource.webViewLink;
  }
}

reFileBaseClass_.getOwner = function getOwner() {
  var owner = this.base.driveFilesResource.owners[0];

  var photoUrl;

  if (DriveApiVersion_ === 2) {
    photoUrl = owner.picture.url;
  } else {
    photoUrl = owner.photoLink;
  }

  var domain = owner.emailAddress.split('@')[1];

  return new ReUser_.Base({
    name: owner.displayName,
    email: owner.emailAddress,
    domain: domain, // not present in File object of Drive API 
    photoUrl: photoUrl
  });
}

reFileBaseClass_.getContentType = function getContentType() {
  return this.base.driveFilesResource.mimeType;
}

reFileBaseClass_.getAs = function getAs(mimeType) {
  // should work the same for v2 and v3
  if (isConvertibleFileType_(this.getContentType())) {
    // Using HTTP endpoint rather than Drive.Files.export() b/c the latter seems to have 
    // a bug. It throws an error that alt=media must be specified (even though this is only
    // supposed to be used for Drive.Files.get() for non-Google file types). And if it is
    // provided, an exception is thrown. See: http://bit.ly/40r4V0z

    var url;
    if (DriveApiVersion_ === 2) {
      url = 'https://www.googleapis.com/drive/v2/files/'
        + this.base.driveFilesResource.id+"/export?mimeType="+ mimeType;
    } else {
      url = 'https://www.googleapis.com/drive/v3/files/'
        + this.base.driveFilesResource.id+"/export?mimeType="+ mimeType;
    }

    var response = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
      }
    });

    if (response.getResponseCode() !== 200) {
      throw new Error('ReFile.getAs(): Drive API returned error ' + response.getResponseCode() 
        + ': ' + response.getContentText());
    }

    var blobContent = response.getContent();
    return Utilities.newBlob(blobContent, mimeType);

  } else {
    // Trying to convert from non Google file type (i.e. png --> jpg). Native DriveApp does
    // support this, but I'm not sure how as files.export() can only convert native Google 
    // Workspace types, and files.get() does not do conversions.
    // See: https://developers.google.com/drive/api/guides/manage-downloads
    throw new Error('ReFile.getAs() does not support non Google Workspace types: ' + mimeType);
  }

}

MAKE_COPY_SIG_NO_ARGS = 1;
MAKE_COPY_SIG_DEST = 2;
MAKE_COPY_SIG_NAME = 3;
MAKE_COPY_SIG_NAME_DEST = 4;

reFileBaseClass_.makeCopy = function makeCopy(a1, a2) {
  var signature;

  var file = ReDriveApp.getFileById(this.getId());

  if (a1 === undefined) {
    // non arguments
    signature = MAKE_COPY_SIG_NO_ARGS;
  } else if (a2 === undefined) {
    // 1 argumemt
    if (typeof a1 === 'string') {
      signature = MAKE_COPY_SIG_NAME;
    } else {
      signature = MAKE_COPY_SIG_DEST; // Folder
    }
  } else {
    signature = MAKE_COPY_SIG_NAME_DEST;
  }

  // defaults
  var name = this.getName();
  var parents = this.base.driveFilesResource.parents;
  
  if (signature === MAKE_COPY_SIG_NAME) {
    name = a1;
  } else if (signature === MAKE_COPY_SIG_DEST) {
    // single argument is of type ReDriveFolder
    if (DriveApiVersion_ === 2) {
      parents = [{"kind": "drive#parentReference", "id": a1.getId()}];
    } else {
      parents = [a1.getId()];
    }
  } else if (signature === MAKE_COPY_SIG_NAME_DEST) {
    name = a1;
    if (DriveApiVersion_ === 2) {
      parents = [{"kind": "drive#parentReference", "id": a2.getId()}];
    } else {
      parents = [a2.getId()];
    }
  }

  var newFile = {
    title: name,
    supportsAllDrives	: true,
    parents: parents
  };

  var copiedFile = Drive.Files.copy(newFile, this.getId());

  return new ReFile_.Base({
    driveFilesResource: copiedFile, // 'Files' recourse from Drive API
  });
}

reFileBaseClass_.setName = function setName(name) {
  var options = {};

  if (DriveApiVersion_ === 2) {
    options.title = name;
    this.base.driveFilesResource.title = name;
  } else {
    options.name = name;
    this.base.driveFilesResource.name = name;
  }

  Drive.Files.update(options, this.base.driveFilesResource.id);

  return this;
}

reFileBaseClass_.setDescription = function setDescription(description) {
  var options = {
    description: description
  };

  this.base.driveFilesResource.description = description;

  Drive.Files.update(options, this.base.driveFilesResource.id);

  return this;
}

reFileBaseClass_.setTrashed = function setTrashed(trashed) {

  if (DriveApiVersion_ === 2) {
    var options = {
      supportsAllDrives: true
    }

    if (trashed) {
      Drive.Files.trash(this.base.driveFilesResource.id, options);
    } else {
      Drive.Files.untrash(this.base.driveFilesResource.id, options);
    }
  } else {

    var updateFields = {
      trashed: trashed
    }
    var options = {
      supportsAllDrives: true
    }

    Drive.Files.update(updateFields, this.base.driveFilesResource.id, options);
  }

  return this;
}


reFileBaseClass_.addViewer = function addViewer(emailAddress) {
  
  var resource = {
    value: emailAddress,
    type: 'user',               
    role: 'reader'
  };

  if (DriveApiVersion_ === 2) {
    Drive.Permissions.insert(resource, this.base.driveFilesResource.id);
  } else {
    Drive.Permissions.create(resource, this.base.driveFilesResource.id);
  }

  return this;
}

reFileBaseClass_.setSharing = function setSharing(accessType, permissionType) {
  var type = 'user';
  var role = 'writer';

  var owner_email = Session.getEffectiveUser().getEmail();
  var domain = owner_email.split('@')[1];

  var permissions = {
    kind: 'drive#permission',
    type: type,
    role: role,
  }

  switch (accessType) {
    case DriveApp.Access.ANYONE:
      permissions.type = 'anyone';
      if (DriveApiVersion_ === 2) {
        permissions.withLink = false;
      } else {
        permissions.allowFileDiscovery = true;
      }
      break;
    case DriveApp.Access.ANYONE_WITH_LINK:
      permissions.type = 'anyone';
      if (DriveApiVersion_ === 2) {
        permissions.withLink = true;
      } else {
        permissions.allowFileDiscovery = false;
      }
      break;
    case DriveApp.Access.DOMAIN:
      permissions.type = 'domain';
      permissions.value = domain;
      if (DriveApiVersion_ === 2) {
        permissions.withLink = false;
      } else {
        permissions.allowFileDiscovery = true;
      }
      break;
    case DriveApp.Access.DOMAIN_WITH_LINK:
      if (DriveApiVersion_ === 2) {
        permissions.withLink = true;
      } else {
        permissions.allowFileDiscovery = false;
      }
      permissions.type = 'domain';
      permissions.value = domain;
      break;
    case DriveApp.Access.PRIVATE:
      permissions.type = 'user';
      permissions.value = owner_email;
      break;
  }

  switch (permissionType) {
    case DriveApp.Permission.VIEW:
      permissions.role = 'reader';
      break;
    case DriveApp.Permission.EDIT:
      permissions.role = 'writer';
      break;
    case DriveApp.Permission.COMMENT:
      if (DriveApiVersion_ === 2) {
        permissions.role = 'reader';
        permissions.additionalRoles = ['commenter'];
      } else {
        permissions.role = 'commenter'
      }
      break;
    case DriveApp.Permission.OWNER:
      permissions.role = 'owner';
      break;
    case DriveApp.Permission.ORGANIZER:
      // Google documentations says this is not supported and will throw an exception.
      throw new Error('Invalid permissionType DriveApp.Permission.ORGANIZER');
    case DriveApp.Permission.FILE_ORGANIZER:
      // Google documentations says this is not supported and will throw an exception.
      throw new Error('Invalid permissionType DriveApp.Permission.FILE_ORGANIZER')
    case DriveApp.Permission.NONE:
      if (accessType !== DriveApp.Access.ANYONE) {
        // Google documentations says this is not supported and will throw an exception
        // unless paired with DriveApp.Access.ANYONE.
        throw new Error('Invalid permissionType DriveApp.Permission.NONE');
      }
      break;

  }
  
  if (DriveApiVersion_ === 2) {
    Drive.Permissions.insert(permissions, this.base.driveFilesResource.id);
  } else {
    Drive.Permissions.create(permissions, this.base.driveFilesResource.id);
  }
  
  return this;
}



function isConvertibleFileType_(mimeType) {
  switch (mimeType) {
    case 'application/vnd.google-apps.document':
    case 'application/vnd.google-apps.drawing':
    case 'application/vnd.google-apps.presentation':
    case 'application/vnd.google-apps.spreadsheet':
      return true;
    default:
      return false;
  }

}

/////////////////////////////////////// ReFileIterator /////////////////////////////////////////////
// Define ReFileIterator class. This is an equivalent to the 'FileIterator' class returned by 
// methods like DriveApp.getFilesByName()
// https://developers.google.com/apps-script/reference/drive/file-iterator
//
var ReFileIterator_ = {};
ReFileIterator_.Base = function (base) {
  this.base = base;
};
var reFileIteratorBaseClass_ = ReFileIterator_.Base.prototype;

reFileIteratorBaseClass_.getContinuationToken = function getContinuationToken() {
  return this.base.nextPageToken;
}

reFileIteratorBaseClass_.hasNext = function hasNext() {
  //console.log('hasNext(): filesIndex = ' + this.base.filesIndex);
  //console.log('hasNext(): files.length = ' + this.base.files.length);

  if ((this.base.filesIndex < this.base.files.length) || (this.base.nextPageToken)) {
    return true;
  }

  return false;
}

reFileIteratorBaseClass_.next = function next() {
  if (!this.hasNext()) {
    throw new Error("reFileIterator has no next file to return");
  }

  if (this.base.filesIndex < this.base.files.length) {
    var file = this.base.files[this.base.filesIndex];
    this.base.filesIndex++;

    var file = new ReFile_.Base({
      driveFilesResource: file, // 'Files' recourse from Drive API
    });

    return file;

  } else if (this.base.nextPageToken) {
    //console.log('nextPageToken: ' + this.base.nextPageToken);
  
    var options = {
      corpora: 'default', // 'user' gives "Invalid Value" error
      //maxResults: 10, // for testing pagination
      pageToken: this.base.nextPageToken,
      q: this.base.queryString
    };

    var results = Drive.Files.list(options);

    var nextPageToken;
    if (results.hasOwnProperty('nextPageToken') && results.nextPageToken) {
      nextPageToken = results.nextPageToken;
    } else {
      nextPageToken = null;
    }
    var files;

    if (DriveApiVersion_ === 2) {
      files = results.items;
    } else {
      files = results.files;
    }

    this.base.nextPageToken = nextPageToken;
    this.base.files = files;
    this.base.filesIndex = 1;

    var file = new ReFile_.Base({
      driveFilesResource:  this.base.files[0] // 'Files' recourse from Drive API
    });

    return file;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////// ReFolderIterator /////////////////////////////////////////////
// Define ReFolderIterator class. This is an equivalent to the 'FolderIterator' class returned by 
// methods like DriveApp.getFoldersByName()
// https://developers.google.com/apps-script/reference/drive/folder-iterator
//
var ReFolderIterator_ = {};
ReFolderIterator_.Base = function (base) {
  this.base = base;
};
var reFolderIteratorBaseClass_ = ReFolderIterator_.Base.prototype;

reFolderIteratorBaseClass_.getContinuationToken = function getContinuationToken() {
  return this.base.fileIterator.nextPageToken;
}

reFolderIteratorBaseClass_.hasNext = function hasNext() {
  return this.base.fileIterator.hasNext();
}

reFolderIteratorBaseClass_.next = function next() {
  return this.base.fileIterator.next();
}

////////////////////////////////////////////////////////////////////////////////////////////////////


///////////////////////////////////////// ReFolder /////////////////////////////////////////////////
// Define ReFolder class. This is an equivalent to the 'Folder' class returned by
// different DriveApp methods (i.e. getFolderById).
var ReFolder_ = {};
ReFolder_.Base = function (base) {
  this.base = base;
};
var reFolderBaseClass_ = ReFolder_.Base.prototype;

reFolderBaseClass_.getId = function getId() {
  return this.base.reFile.getId();
}

reFolderBaseClass_.getName = function getName() {
  return this.base.reFile.getName();
}

reFolderBaseClass_.setTrashed = function setTrashed(trashed) {
  return this.base.reFile.setTrashed(trashed);
}

reFolderBaseClass_.setSharing = function setSharing(accessType, permissionType) {
  return this.base.reFile.setSharing(accessType, permissionType);
}

////////////////////////////////////////// ReUser //////////////////////////////////////////////////
// Define ReUser class. This is an equivalent to the 'User' class returned by
// different DriveApp methods (i.e. File.getOwner)
var ReUser_ = {};
ReUser_.Base = function (base) {
  this.base = base;
};
var reUserBaseClass_ = ReUser_.Base.prototype;


reUserBaseClass_.getName = function getName() {
  return this.base.name;
}

reUserBaseClass_.getEmail = function getEmail() {
  return this.base.email;
}

reUserBaseClass_.getPhotoUrl = function getPhotoUrl() {
  return this.base.photoUrl;
}

reUserBaseClass_.getDomain = function getDomain() {
  return this.base.domain;
}

